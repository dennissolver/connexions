export async function verify(run: any) {
  const res = await fetch(`https://api.github.com/repos/${run.github_repo}/contents/README.md`);
  if (res.status === 200) return 'ADVANCE';
  return 'WAIT';
}
