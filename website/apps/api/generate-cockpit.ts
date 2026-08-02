import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching data from database...');

  // 1. Settings
  const settingsRecords = await prisma.setting.findMany();
  const settingsObj: any = {
    siteNameAr: '', siteNameEn: '', siteDescription: '',
    phone: '', email: '', address: '',
    social: { facebook: '', instagram: '', youtube: '', linkedin: '' },
    mainLogo: null, footerLogo: null
  };
  
  for (const s of settingsRecords) {
    if (s.key === 'contact_phone') settingsObj.phone = s.value;
    if (s.key === 'contact_email') settingsObj.email = s.value;
    if (s.key === 'contact_address') settingsObj.address = s.value;
    if (s.key === 'social_facebook') settingsObj.social.facebook = s.value;
    if (s.key === 'social_instagram') settingsObj.social.instagram = s.value;
    if (s.key === 'social_youtube') settingsObj.social.youtube = s.value;
    if (s.key === 'social_linkedin') settingsObj.social.linkedin = s.value;
    if (s.key === 'site_name_ar') settingsObj.siteNameAr = s.value;
    if (s.key === 'site_name_en') settingsObj.siteNameEn = s.value;
    if (s.key === 'site_description') settingsObj.siteDescription = s.value;
  }

  // 2. Pages
  const pagesRecords = await prisma.page.findMany();
  const pages: any = {};
  for (const p of pagesRecords) {
    pages[p.slug] = {
      title: p.title || { ar: '', en: '' },
      content: p.customFields || { ar: '', en: '' }
    };
  }

  // 3. Hospitals
  const hospitals = await prisma.hospital.findMany();
  const hospitalsData = hospitals.map(h => ({
    name: h.name || { ar: '', en: '' },
    slug: h.slug,
    shortDescription: h.shortDescription || { ar: '', en: '' },
    description: h.description || { ar: '', en: '' },
    heroTagline: h.heroTagline || { ar: '', en: '' },
    heroStats: h.heroStats || [],
    departments: h.departments || [],
    location: h.locations || { ar: '', en: '' },
    brandColor: h.brandColor || '#0B1F3A',
    googleMapsUrl: h.googleMapsUrl || '',
    heroImage: h.heroImage || null,
    logoUrl: h.logoUrl || null
  }));

  // 4. Centers
  const centers = await prisma.medicalCenter.findMany({
    include: {
      clinics: true,
      bookingQuestions: true,
      hospitals: { include: { hospital: true } }
    }
  });
  
  const centersData = centers.map(c => ({
    name: c.name || { ar: '', en: '' },
    slug: c.slug,
    hospitalSlug: c.hospitals?.[0]?.hospital?.slug || '',
    isFeatured: c.isFeatured,
    description: c.description || { ar: '', en: '' },
    heroImage: c.heroImage || null,
    clinics: c.clinics.map(cl => ({
      name: cl.name || { ar: '', en: '' },
      scheduleText: (cl.schedule as any)?.text || ''
    })),
    bookingQuestions: c.bookingQuestions.map(bq => ({
      question: bq.questionText || { ar: '', en: '' },
      type: bq.questionType || 'BOOLEAN',
      required: bq.isRequired
    }))
  }));

  // 5. Doctors
  const doctors = await prisma.doctor.findMany({
    include: { centers: { include: { medicalCenter: true } } }
  });
  const doctorsData = doctors.map(d => ({
    name: d.name || { ar: '', en: '' },
    slug: d.slug,
    title: d.title || { ar: '', en: '' },
    specialty: d.specialty || { ar: '', en: '' },
    bio: d.bio || { ar: '', en: '' },
    centerSlug: d.centers?.[0]?.medicalCenter?.slug || '',
    isFeatured: d.isFeatured,
    photo: d.photo || null
  }));

  // 6. FAQs
  const faqs = await prisma.faqItem.findMany({ orderBy: { order: 'asc' } });
  const faqsData = faqs.map(f => ({
    topic: f.topic || { ar: '', en: '' },
    question: f.question || { ar: '', en: '' },
    answer: f.answer || { ar: '', en: '' },
    order: f.order
  }));

  // 7. News
  const news = await prisma.newsPost.findMany();
  const newsData = news.map(n => ({
    title: n.title || { ar: '', en: '' },
    slug: n.slug,
    excerpt: n.excerpt || { ar: '', en: '' },
    body: n.body || { ar: '', en: '' },
    featuredImage: n.featuredImage || null
  }));

  // 8. Testimonials
  const testimonials = await prisma.testimonial.findMany();
  const testimonialsData = testimonials.map(t => ({
    name: t.name || { ar: '', en: '' },
    audience: t.audience,
    quote: t.quote || { ar: '', en: '' },
    rating: 5,
    photo: t.photo || null
  }));

  // 9. AI Knowledge Base
  const aiKnowledge = await prisma.aiKnowledgeBase.findMany();
  const aiKnowledgeData = aiKnowledge.map(k => ({
    topic: k.topic || { ar: '', en: '' },
    category: k.category || '',
    question: k.question || { ar: '', en: '' },
    answer: k.answer || { ar: '', en: '' }
  }));

  const fullData = {
    settings: settingsObj,
    pages: pages,
    hospitals: hospitalsData,
    centers: centersData,
    doctors: doctorsData,
    faqs: faqsData,
    news: newsData,
    testimonials: testimonialsData,
    aiKnowledge: aiKnowledgeData
  };

  const htmlPath = path.join(__dirname, '../../../insan-content-cockpit-v2.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');

  const dataString = JSON.stringify(fullData, null, 4);
  
  const replacementTarget = "data: {\n                        settings: {\n                            siteNameAr: '', siteNameEn: '', siteDescription: '',\n                            phone: '', email: '', address: '',\n                            social: { facebook: '', instagram: '', youtube: '', linkedin: '' },\n                            mainLogo: null, footerLogo: null\n                        },\n                        pages: {\n                            about: { title: {ar: 'من نحن'}, content: {ar: '', en: ''} },\n                            privacy: { title: {ar: 'سياسة الخصوصية'}, content: {ar: '', en: ''} },\n                            terms: { title: {ar: 'الشروط والأحكام'}, content: {ar: '', en: ''} },\n                            investors: { title: {ar: 'علاقات المستثمرين'}, content: {ar: '', en: ''} }\n                        },\n                        hospitals: [],\n                        centers: [],\n                        doctors: [],\n                        faqs: [],\n                        news: [],\n                        testimonials: [],\n                        aiKnowledge: []\n                    }";

  html = html.replace(replacementTarget, "data: " + dataString);

  const importHtml = "<label class=\"btn-add flex items-center gap-2 cursor-pointer bg-blue-50\">\n<svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12\"></path></svg>\nاستيراد من ملف (JSON)\n<input type=\"file\" class=\"hidden\" accept=\".json\" @change=\"importJSON\">\n</label>\n<button @click=\"exportJSON\" class=\"btn-primary flex items-center gap-2\">";
                
  html = html.replace('<button @click="exportJSON" class="btn-primary flex items-center gap-2">', importHtml);

  const importMethod = "importJSON(event) {\nconst file = event.target.files[0];\nif (!file) return;\nconst reader = new FileReader();\nreader.onload = (e) => {\ntry {\nconst imported = JSON.parse(e.target.result);\nthis.data = imported;\nalert('تم استيراد البيانات بنجاح!');\n} catch (err) {\nalert('ملف غير صالح.');\n}\n};\nreader.readAsText(file);\n},\nexportJSON() {";

  html = html.replace('exportJSON() {', importMethod);

  const outPath = path.join(__dirname, '../../../insan-data-entry-filled.html');
  fs.writeFileSync(outPath, html);
  console.log('✅ Generated filled HTML at:', outPath);
}

main().catch(console.error).finally(() => prisma.$disconnect());
