// lib/provisioning/bulk-cleanup.ts
// One-time script to clean up all failed provision runs

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface FailedRun {
  project_slug: string;
  supabase_ref: string | null;
  vercel_id: string | null;
  github_repo: string | null;
}

const failedRuns: FailedRun[] = [
  { project_slug: "f3k-survey", supabase_ref: "wiejkojfogzfubjsmtni", vercel_id: "prj_lELiE5JqkMY7r5VCUZaYXrNtBHfJ", github_repo: "dennissolver/cx-f3k-survey" },
  { project_slug: "50-survey", supabase_ref: "jfdqrwyxyktbfjblskxx", vercel_id: null, github_repo: "dennissolver/cx-50-survey" },
  { project_slug: "test-three", supabase_ref: "jhrykancdbpfgzbgqgjp", vercel_id: "prj_ZR5Bvkgxciq6PvSV7uPVUaHdtO0M", github_repo: "dennissolver/cx-test-three" },
  { project_slug: "35-survey", supabase_ref: "tylfozetehuvmoiyrkim", vercel_id: "prj_9ZDwkcSuioUjxaTOMPeYu2t8Eiey", github_repo: "dennissolver/cx-35-survey" },
  { project_slug: "1700-survey", supabase_ref: "zxikkaxbpdgghrzloell", vercel_id: "prj_y88g3VjL8dxaHCMURmeuYffxO6DF", github_repo: "dennissolver/cx-1700-survey" },
  { project_slug: "80-survey", supabase_ref: "wemvuxqhlwflkwwhvmex", vercel_id: "prj_gooHo3E9JUdxSGFpgh7wb00VduTY", github_repo: "dennissolver/cx-80-survey" },
  { project_slug: "110-survey", supabase_ref: "hvtcuunuidjysbngwdjm", vercel_id: "prj_JlkZ5Dr1ddOmy7UJRsk8BkO4qlpj", github_repo: "dennissolver/cx-110-survey" },
  { project_slug: "950-survey", supabase_ref: "rwfhnjbtlyuirkdctdjo", vercel_id: null, github_repo: "dennissolver/cx-950-survey" },
  { project_slug: "test-platform", supabase_ref: "dlbajrhcexpzbdrcespu", vercel_id: null, github_repo: null },
  { project_slug: "90-survey", supabase_ref: "bqkiyaaplkqdcmugretq", vercel_id: null, github_repo: "dennissolver/cx-90-survey" },
  { project_slug: "300-survey", supabase_ref: "zyduqbhqsokwkuxfmmvl", vercel_id: null, github_repo: "dennissolver/cx-300-survey" },
  { project_slug: "100-survey", supabase_ref: "pdlmrtpechyoqchfdydc", vercel_id: "prj_3mFvVUSmvE8f3VoggBlRm1CL8Eep", github_repo: "dennissolver/cx-100-survey" },
  { project_slug: "250-survey", supabase_ref: "yilebjnrqqurpubbauxn", vercel_id: "prj_oy9D7gbl1MbZb397btmhRTwyh8XR", github_repo: "dennissolver/cx-250-survey" },
  { project_slug: "700-survey", supabase_ref: "kmitnqwmfkagmbansftb", vercel_id: null, github_repo: null },
  { project_slug: "400-survey", supabase_ref: "wncgrvtuqgyahsojcncw", vercel_id: "prj_uJA5lhM6rHn0r1fq8O3AUl4kwp9b", github_repo: "dennissolver/cx-400-survey" },
  { project_slug: "120-survey", supabase_ref: "fhewgodjxtnvchitccjo", vercel_id: null, github_repo: "dennissolver/cx-120-survey" },
  { project_slug: "600-survey", supabase_ref: "tofzrivthijrowcrtxnt", vercel_id: "prj_YeyTOXNa7vxQ6VNmiara0FVVrZmQ", github_repo: "dennissolver/cx-600-survey" },
  { project_slug: "200-survey", supabase_ref: "aqjbvsqxumjdtfgisnre", vercel_id: "prj_Hqkvd2LmKltr9utLm6fCeZR4574v", github_repo: "dennissolver/cx-200-survey" },
  { project_slug: "60-survey", supabase_ref: "mkkaawarimjbnszqagfp", vercel_id: "prj_OGapsGBTFZcEuvn96G2AhCP3ssDB", github_repo: "dennissolver/cx-60-survey" },
  { project_slug: "975-survey", supabase_ref: "jzlmfptxngemaacecqys", vercel_id: "prj_oiPau34cOC30H3rQQP0ZAM9ujhOA", github_repo: "dennissolver/cx-975-survey" },
  { project_slug: "1000-survey", supabase_ref: "nyshuktqipmjnjrqvmrc", vercel_id: null, github_repo: null },
  { project_slug: "f27-survey", supabase_ref: "rhxahbazrbtaduzotpuc", vercel_id: "prj_G6sLd5B6MZzaJTYoDllVUwXRpqON", github_repo: "dennissolver/cx-f27-survey" },
  { project_slug: "1800-survey", supabase_ref: "jglqtevanamupnjoaygk", vercel_id: null, github_repo: null },
  { project_slug: "70-survey", supabase_ref: "gpwkvwmlkbxkorxlmtxm", vercel_id: "prj_rnzMWFrIpqGCUBexqvKPsTcuTLJt", github_repo: "dennissolver/cx-70-survey" },
  { project_slug: "130-survey", supabase_ref: "sxkoajiauhgjkudbdtqh", vercel_id: "prj_KGFgBogHOfAQn88tQD2DurhPLWup", github_repo: "dennissolver/cx-130-survey" },
  { project_slug: "30-survey", supabase_ref: "agdvyhgipfqtioifbubu", vercel_id: "prj_mqxNoONxqpFFpWZM6cGFmah9tVPm", github_repo: "dennissolver/cx-30-survey" },
  { project_slug: "28-survey", supabase_ref: "xxoucxxwvdalxqkfttmj", vercel_id: "prj_oQbIxwaMidPoiTl8giX31awy29eA", github_repo: "dennissolver/cx-28-survey" },
  { project_slug: "29-survey", supabase_ref: "dobxfewrvicsgouaspkz", vercel_id: "prj_VAFioO8lzCEBvohU26mgTJQ7C1Im", github_repo: "dennissolver/cx-29-survey" },
  { project_slug: "900-survey", supabase_ref: "uxvyzekforyhtlqwfnys", vercel_id: "prj_yHg3ig2y8s6YU9pgTGrLtx9DiT4K", github_repo: "dennissolver/cx-900-survey" },
  { project_slug: "1100-survey", supabase_ref: "bnicngxwxhuqgihcwboz", vercel_id: "prj_jIrZeMKciypa1YAHTGwTrxRTmp8k", github_repo: "dennissolver/cx-1100-survey" },
  { project_slug: "40-survey", supabase_ref: "usnhtfemahbdqbzmcidr", vercel_id: "prj_vagxDTKqBG8IJe13HewEXg5Ag994", github_repo: "dennissolver/cx-40-survey" },
];

export async function bulkCleanup() {
  const results: { slug: string; supabase: string; vercel: string; github: string }[] = [];

  for (const run of failedRuns) {
    const result = { slug: run.project_slug, supabase: 'skipped', vercel: 'skipped', github: 'skipped' };

    // Delete Supabase project
    if (run.supabase_ref && SUPABASE_ACCESS_TOKEN) {
      try {
        const res = await fetch(`https://api.supabase.com/v1/projects/${run.supabase_ref}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}` },
        });
        result.supabase = res.ok ? 'deleted' : `failed:${res.status}`;
      } catch (e) { result.supabase = 'error'; }
    }

    // Delete Vercel project
    if (run.vercel_id && VERCEL_TOKEN) {
      try {
        const url = new URL(`https://api.vercel.com/v9/projects/${run.vercel_id}`);
        if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);
        const res = await fetch(url.toString(), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` },
        });
        result.vercel = res.ok ? 'deleted' : `failed:${res.status}`;
      } catch (e) { result.vercel = 'error'; }
    }

    // Delete GitHub repo
    if (run.github_repo && GITHUB_TOKEN) {
      try {
        const res = await fetch(`https://api.github.com/repos/${run.github_repo}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
          },
        });
        result.github = res.ok || res.status === 404 ? 'deleted' : `failed:${res.status}`;
      } catch (e) { result.github = 'error'; }
    }

    results.push(result);
    console.log(`Cleaned ${run.project_slug}:`, result);
  }

  return results;
}
