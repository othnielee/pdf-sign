export const chainToArray = (certChain: string): string[] => {
  return certChain?.split(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----/)
    .map(data => data.trim())
    .filter(data => data?.length > 0)
    .map(data => {
      const blockformat = data.match(/.{1,64}/g)?.join('\n') || data;
      return `-----BEGIN CERTIFICATE-----\n${blockformat}\n-----END CERTIFICATE-----`;
    });
}