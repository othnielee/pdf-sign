export interface AzureKeyVaultConfig {
  vaultName: string;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  clientCertificateFile?: string;
  certificateName: string;
  certificateFullChainName?: string;
}