export type StubAutomationResult<TOutput> = {
  provider: "stub";
  status: "succeeded";
  output: TOutput;
};

export async function runStubAutomation<TOutput>(output: TOutput): Promise<StubAutomationResult<TOutput>> {
  return {
    provider: "stub",
    status: "succeeded",
    output
  };
}
