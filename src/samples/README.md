# Recorded provider responses

One real response per provider endpoint, captured from the live APIs.

They serve two purposes and the order matters: **production owns them**, and the
tests borrow them.

1. **Demo and Auto mode** (`src/sources/demo.ts`) serve these when a provider has
   no key, hits its rate limit, or the reader explicitly chooses Demo. That is why
   they live under `src/` rather than in a test folder — shipping them is deliberate.
2. **Mapper tests** assert against them, so normalisation is verified against what
   the APIs actually send rather than against what their documentation claims. This
   is how the NYT `multimedia` change was caught.

Re-record with a real key when a provider changes shape; do not hand-edit.
