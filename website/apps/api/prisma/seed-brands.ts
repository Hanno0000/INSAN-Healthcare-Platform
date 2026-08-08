/**
 * Brand-only seed — safe to run against a populated production database.
 *
 * Why this exists
 * ---------------
 * The receptionist cannot answer a Messenger message until three tables are
 * populated:
 *
 *   Brand               — INSAN / FUTURE / DELTA
 *   BrandSocialAccount  — Facebook page id → brand, which is how an incoming
 *                         message is attributed to a hospital. MessengerAdapter
 *                         .toInbound() drops any message whose pageId has no
 *                         active row, by design: replying as the wrong hospital
 *                         is worse than not replying.
 *   BrandPersona        — voice and business rules, read from
 *                         receptionist/prompts/brands/*.md
 *
 * On 2026-08-08 all three were found empty on production. `prisma db seed`
 * would have populated them, but it also calls prisma.testimonial.deleteMany()
 * and deleteMany on each hospital's clinics and booking questions, which would
 * have destroyed content entered by hand through the admin panel. So the whole
 * seed is not runnable there, and hand-written SQL was not a good option either
 * — the persona text is long Markdown in Arabic, held in reviewed files.
 *
 * This script reuses the exact same seeders as the full seed, limited to the
 * three that touch brands. All three are upsert / create-if-missing and contain
 * no deleteMany, so this is re-runnable and cannot remove anything.
 *
 * Usage:  pnpm db:seed:brands
 */
import { prisma, seedIntegrationSettings, seedBrands, seedBrandPersonas } from './seed';

async function main() {
  console.log('🌱 Seeding brands only (non-destructive)...');
  console.log('');

  // Ordering matters and mirrors the full seed: seedBrands links each social
  // account to an IntegrationSetting by provider key, so the settings must
  // exist first or integrationSettingId lands null. Nothing downstream of the
  // messenger reads that column, but leaving it null when it does not have to
  // be would be a silent gap for whoever looks next.
  await seedIntegrationSettings();
  await seedBrands();
  await seedBrandPersonas();

  console.log('');

  // Report what is actually in the database rather than what the seeders
  // claimed, so a partial result is visible instead of implied by silence.
  const brands = await prisma.brand.findMany({
    orderBy: { code: 'asc' },
    include: { socialAccounts: true, persona: true },
  });

  if (brands.length === 0) {
    console.error('❌ No brands present after seeding — investigate before continuing.');
    process.exitCode = 1;
    return;
  }

  console.log('Result:');
  for (const b of brands) {
    const fb = b.socialAccounts.find((a) => a.platform === 'FACEBOOK');
    const fbState = fb ? `${fb.pageId}${fb.isActive ? '' : ' (INACTIVE)'}` : 'none';
    console.log(
      `  ${b.code.padEnd(7)} facebook=${String(fbState).padEnd(22)} persona=${b.persona ? b.persona.entryMode : 'MISSING'}`,
    );
  }

  const messengerReady = brands.filter(
    (b) => b.socialAccounts.some((a) => a.platform === 'FACEBOOK' && a.isActive && a.pageId !== 'placeholder') && b.persona,
  );

  console.log('');
  console.log(`✅ ${messengerReady.length} of ${brands.length} brand(s) ready to receive Messenger traffic.`);
  if (messengerReady.length < brands.length) {
    console.log('   A brand is only ready with BOTH an active non-placeholder Facebook page id AND a persona.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Brand seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
