import { AzureKeyVaultConfig } from './azure-keyvault-config.interface';
import { SignatureOptions } from '../../sign/interfaces/signature-options.interface';

export interface AppSettings {
  app: {
    name: string;
    version: string;
  };
  logger: {
    directory: string;
    file: string;
  };
  azureKeyVault?: AzureKeyVaultConfig;
  pemCertificate?: {
    fullChainPath: string;
    keyPath: string;
  };
  p12Certificate?: {
    path: string;
    password?: string;
  };
  signatureOptions: SignatureOptions;
}