NUKE-AND-REPLACE INSTRUCTIONS
============================

This ZIP assumes you DELETE the following legacy files if they exist:

1) lib/provisioning/steps/index.ts
2) lib/provisioning/steps/states.ts
3) Any file exporting a `STEPS` object
4) Any executeStep.ts that accepts `ProvisionState`

Search your repo for:
  - STEPS[
  - executeProvisionStep(state: ProvisionState

They must not exist after applying this ZIP.

This ZIP installs the ONLY supported execution path:
orchestrator -> engine -> executeStep -> registry

If build still fails, a legacy file was not deleted.
