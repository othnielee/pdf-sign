import dotenv from 'dotenv';
import { join } from 'path';
import { CertificateClient, KeyVaultCertificateWithPolicy } from '@azure/keyvault-certificates';
import { KeyClient, CryptographyClient } from '@azure/keyvault-keys';
import { SecretClient } from '@azure/keyvault-secrets';
import { TokenCredential, ClientCertificateCredential, ClientSecretCredential, DefaultAzureCredential } from '@azure/identity';
import { AzureKeyVaultConfig } from '../interfaces/azure-keyvault-config.interface';
import { AZURE_CERTIFICATE_FILE_RELATIVE_PATH } from '../infrastructure.constants';

export class AzureKeyVaultService {
  constructor(private readonly config: AzureKeyVaultConfig) {
    if (this.config.tenantId && this.config.clientId && this.config.clientCertificateFile) {
      const path = join(__dirname, AZURE_CERTIFICATE_FILE_RELATIVE_PATH, this.config.clientCertificateFile);
      this.credential = new ClientCertificateCredential(this.config.tenantId, this.config.clientId, path);
    } else if (this.config.tenantId && this.config.clientId && this.config.clientSecret) {
      this.credential = new ClientSecretCredential(this.config.tenantId, this.config.clientId, this.config.clientSecret);
    } else {
      dotenv.config();
      this.credential = new DefaultAzureCredential();
    }

    const keyVaultUrl = `https://${this.config.vaultName}.vault.azure.net`;

    this.certificateClient = new CertificateClient(keyVaultUrl, this.credential);
    this.keyClient = new KeyClient(keyVaultUrl, this.credential);
    this.secretClient = new SecretClient(keyVaultUrl, this.credential);
  }

  private credential: TokenCredential;
  private certificateClient: CertificateClient;
  private keyClient: KeyClient;
  private secretClient: SecretClient;

  async getCertificateWithPolicy(): Promise<KeyVaultCertificateWithPolicy> {
    try {
      return await this.certificateClient.getCertificate(this.config.certificateName);

    } catch (err) {
      throw new Error('Could not get the certificate with policy.');
    }
  }

  async getCertificateFullChain(): Promise<string> {
    try {
      if (!this.config.certificateFullChainName) {
        throw new Error('The name of the certificate chain secret is not set.');
      }

      const certificateSecret = await this.secretClient.getSecret(this.config.certificateFullChainName);

      if (!certificateSecret?.value) {
        throw new Error('Could not get the certificate data.');
      }

      return certificateSecret.value;

    } catch (err) {
      throw new Error('Could not get the full certificate chain.');
    }
  }

  async getCyptopgraphyClient(): Promise<CryptographyClient> {
    try {
      const keyVaultKey = await this.keyClient.getKey(this.config.certificateName);

      if (!keyVaultKey?.id) {
        throw new Error('Could not get the cryptography key.');
      }

      return new CryptographyClient(keyVaultKey.id, this.credential);

    } catch (err) {
      throw new Error('Could not get the cryptography client.');
    }
  }
}
