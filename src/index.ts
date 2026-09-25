const CONTEXT = 'https://schema.org';

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '').map(([key, item]) => [key, compact(item)]));
  }
  return value;
}

function absoluteUrl(value, baseUrl) {
  if (!value) return value;
  try { return new URL(value, baseUrl).href; } catch { return value; }
}

function ref(entity, fallbackType = 'Organization') {
  if (!entity) return undefined;
  if (typeof entity === 'string') return { '@id': entity };
  if (entity['@id'] && Object.keys(entity).length === 1) return entity;
  return compact({ '@type': entity['@type'] || fallbackType, '@id': entity['@id'], name: entity.name, url: entity.url, sameAs: entity.sameAs });
}

export function buildOrganization(input, options = {}) {
  const baseUrl = options.baseUrl || input.url;
  const type = input.type === 'Person' ? 'Person' : (input.type || 'EducationalOrganization');
  const result = compact({
    '@context': CONTEXT,
    '@type': type,
    '@id': input['@id'] || (baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/#organization` : undefined),
    name: input.name,
    alternateName: input.alternateName,
    description: input.description,
    url: absoluteUrl(input.url || baseUrl, baseUrl),
    logo: absoluteUrl(input.logo, baseUrl),
    image: absoluteUrl(input.image, baseUrl),
    email: input.email,
    telephone: input.telephone,
    sameAs: input.sameAs,
    knowsAbout: input.knowsAbout,
    address: input.address && compact({ '@type': 'PostalAddress', ...input.address })
  });
  return result;
}

function buildPerson(input, baseUrl) {
  return compact({
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': input['@id'] || (input.url ? `${absoluteUrl(input.url, baseUrl)}#person` : undefined),
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url, baseUrl),
    image: absoluteUrl(input.image, baseUrl),
    jobTitle: input.jobTitle,
    knowsAbout: input.knowsAbout,
    sameAs: input.sameAs,
    worksFor: ref(input.worksFor)
  });
}

function buildOffer(input, baseUrl) {
  if (!input) return undefined;
  return compact({
    '@type': 'Offer',
    price: input.price,
    priceCurrency: input.priceCurrency || 'VND',
    url: absoluteUrl(input.url, baseUrl),
    availability: input.availability && (input.availability.startsWith('http') ? input.availability : `https://schema.org/${input.availability}`),
    validFrom: input.validFrom,
    priceValidUntil: input.priceValidUntil,
    category: input.category
  });
}

function buildInstance(input, baseUrl, instructors = {}) {
  const teachers = input.instructor ? (Array.isArray(input.instructor) ? input.instructor : [input.instructor]) : undefined;
  return compact({
    '@type': 'CourseInstance',
    name: input.name,
    courseMode: input.courseMode,
    courseWorkload: input.courseWorkload,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location && compact({ '@type': 'Place', ...input.location }),
    instructor: teachers?.map((teacher) => typeof teacher === 'string' ? ref(instructors[teacher] || { name: teacher }, 'Person') : ref(teacher, 'Person')),
    offers: buildOffer(input.offer || input.offers, baseUrl)
  });
}

export function buildCourse(input, options = {}) {
  const baseUrl = options.baseUrl || input.url;
  const url = absoluteUrl(input.url || (input.slug && baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/${input.slug}` : undefined), baseUrl);
  const instances = input.instances || (input.instance ? [input.instance] : []);
  return compact({
    '@context': CONTEXT,
    '@type': 'Course',
    '@id': input['@id'] || (url ? `${url}#course` : undefined),
    url,
    name: input.name,
    description: input.description,
    courseCode: input.courseCode,
    educationalLevel: input.educationalLevel,
    inLanguage: input.inLanguage || options.language || 'vi',
    provider: ref(input.provider || options.provider),
    teaches: input.teaches,
    syllabusSections: input.syllabusSections,
    hasCourseInstance: instances.map((instance) => buildInstance(instance, baseUrl, options.instructors))
  });
}

function withoutContext(node) {
  const { '@context': ignored, ...rest } = node;
  return rest;
}

export function buildAll(config) {
  const baseUrl = config.site?.baseUrl || config.baseUrl;
  const language = config.site?.language || 'vi';
  const organization = buildOrganization(config.organization || {}, { baseUrl });
  const instructorList = (config.instructors || []).map((person) => buildPerson(person, baseUrl));
  const instructors = Object.fromEntries((config.instructors || []).map((person, i) => [person.id || person.name, instructorList[i]]));
  const provider = ref(organization);
  const courses = (config.courses || []).map((course) => buildCourse(course, { baseUrl, language, provider, instructors }));
  const itemList = compact({
    '@context': CONTEXT,
    '@type': 'ItemList',
    name: config.courseListName || 'Danh sách khóa học',
    numberOfItems: courses.length,
    itemListElement: courses.map((course, index) => ({ '@type': 'ListItem', position: index + 1, url: course.url, item: withoutContext(course) }))
  });
  const faq = config.faq?.length ? { '@context': CONTEXT, '@type': 'FAQPage', mainEntity: config.faq.map((entry) => ({ '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: entry.answer } })) } : undefined;
  const breadcrumb = config.breadcrumbs?.length ? { '@context': CONTEXT, '@type': 'BreadcrumbList', itemListElement: config.breadcrumbs.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, name: entry.name, item: absoluteUrl(entry.url, baseUrl) })) } : undefined;
  const datasets = (config.datasets || []).map((data) => compact({ '@context': CONTEXT, '@type': 'Dataset', name: data.name, description: data.description, url: absoluteUrl(data.url, baseUrl), creator: ref(data.creator || provider), datePublished: data.datePublished, dateModified: data.dateModified, license: absoluteUrl(data.license, baseUrl), distribution: data.distribution?.map((entry) => compact({ '@type': 'DataDownload', encodingFormat: entry.encodingFormat, contentUrl: absoluteUrl(entry.contentUrl, baseUrl) })) }));
  return compact({ organization, instructors: instructorList, courses, itemList, faq, breadcrumb, datasets });
}

function isAbsoluteUrl(value) {
  try { const parsed = new URL(value); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch { return false; }
}

function isIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const [, year, month, day] = match.map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function validate(value, options = {}) {
  const errors = [];
  const warnings = [];
  const region = options.region || 'VN';
  const seen = new Set();
  function add(level, code, path, message) { (level === 'error' ? errors : warnings).push({ code, path: path || '$', message }); }
  function walk(node, path = '$') {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (node['@type'] === 'Course') {
      for (const field of ['name', 'description']) if (!node[field] || (typeof node[field] === 'string' && !node[field].trim())) add('error', 'REQUIRED_FIELD', path, `Course thiếu trường bắt buộc: ${field}`);
      if (!node.provider || (typeof node.provider === 'object' && !node.provider.name && !node.provider['@id'])) add('error', 'REQUIRED_FIELD', path, 'Course thiếu provider hợp lệ (cần name hoặc @id).');
      if (typeof node.description === 'string' && node.description.length > 60) add('warning', 'GOOGLE_DESCRIPTION_LENGTH', `${path}.description`, 'Google Course list chỉ hiển thị tối đa 60 ký tự mô tả.');
    }
    if (node['@type'] === 'ItemList') {
      if (!Array.isArray(node.itemListElement) || !node.itemListElement.length) add('error', 'REQUIRED_FIELD', path, 'ItemList thiếu itemListElement.');
      if ((node.itemListElement?.length || 0) < 3) add('warning', 'GOOGLE_MIN_COURSES', path, 'Google Course list yêu cầu đánh dấu ít nhất 3 khóa học.');
      const urls = (node.itemListElement || []).map((item) => item?.url).filter(Boolean);
      if (new Set(urls).size !== urls.length) add('error', 'DUPLICATE_LIST_URL', `${path}.itemListElement`, 'Mỗi ListItem của Course list phải có URL duy nhất.');
    }
    if (node['@type'] === 'ListItem') {
      if (node.position === undefined || node.position === '') add('error', 'REQUIRED_FIELD', path, 'ListItem thiếu trường bắt buộc: position');
      if (node.item && typeof node.item === 'object' && !node.url) add('error', 'REQUIRED_FIELD', path, 'ListItem của Course list thiếu trường bắt buộc: url');
      if (typeof node.item === 'string' && !node.item) add('error', 'REQUIRED_FIELD', path, 'ListItem của BreadcrumbList thiếu trường bắt buộc: item');
      if (typeof node.item === 'string' && !isAbsoluteUrl(node.item)) add('error', 'RELATIVE_URL', `${path}.item`, `URL phải là tuyệt đối: ${node.item}`);
    }
    if (node['@type'] === 'Offer') {
      if (typeof node.price !== 'number' || !Number.isFinite(node.price)) add('error', 'INVALID_PRICE', `${path}.price`, 'Giá phải là số hữu hạn.');
      if (region === 'VN' && node.priceCurrency !== 'VND') add('error', 'INVALID_CURRENCY', `${path}.priceCurrency`, 'Giá tại Việt Nam phải dùng VND.');
    }
    if (Array.isArray(node.sameAs)) {
      const duplicate = node.sameAs.find((item, index) => node.sameAs.indexOf(item) !== index);
      if (duplicate) add('error', 'DUPLICATE_SAME_AS', `${path}.sameAs`, `sameAs bị trùng: ${duplicate}`);
      node.sameAs.forEach((url, index) => { if (typeof url === 'string' && !isAbsoluteUrl(url)) add('error', 'RELATIVE_URL', `${path}.sameAs[${index}]`, `URL phải là tuyệt đối: ${url}`); });
    }
    for (const [key, child] of Object.entries(node)) {
      const childPath = `${path}.${key}`;
      if ((key === 'url' || key === '@id' || key === 'logo' || key === 'image' || key === 'contentUrl' || key === 'license' || key === 'sameAs') && typeof child === 'string' && !isAbsoluteUrl(child)) add('error', 'RELATIVE_URL', childPath, `URL phải là tuyệt đối: ${child}`);
      if ((/date/i.test(key) || ['startTime', 'endTime', 'validFrom'].includes(key)) && typeof child === 'string' && !isIsoDate(child)) add('error', 'INVALID_DATE', childPath, `Ngày không đúng ISO 8601: ${child}`);
      if (Array.isArray(child)) child.forEach((entry, index) => walk(entry, `${childPath}[${index}]`));
      else walk(child, childPath);
    }
  }
  walk(value);
  return { valid: errors.length === 0, errors, warnings };
}

export function toScript(value) {
  return `<script type="application/ld+json">\n${JSON.stringify(value, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

export function buildLlms(config) {
  const title = config.organization?.name || config.site?.name || 'Website giáo dục';
  const lines = [`# ${title}`, '', `> ${config.organization?.description || 'Thông tin khóa học.'}`, ''];
  for (const course of config.courses || []) {
    lines.push(`## ${course.name}`, '', course.description || '', '', `- Link: ${new URL(course.url || course.slug, config.site?.baseUrl).href}`, '');
  }
  return `${lines.join('\n').trim()}\n`;
}

export { parseYaml, parseConfig } from './yaml.js';
