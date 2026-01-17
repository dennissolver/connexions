// app/api/setup/start/route.ts

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.platformName) {
    return NextResponse.json(
      { error: "platformName is required" },
      { status: 400 }
    );
  }

  const run = await createProvisionRun({
    platformName: body.platformName,
    companyName: body.companyName,
    metadata: body, // FULL setup payload stored
  });

  runProvisioning(run.project_slug).catch(console.error);

  return NextResponse.json({
    projectSlug: run.project_slug,
  });
}
