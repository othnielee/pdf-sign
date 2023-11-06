import { readFile, writeFile, access, constants } from 'fs/promises';
import { ConfigService, Logger, AzureKeyVaultService } from './infrastructure';
import { KeyVaultSigner, P12Signer, PemSigner } from './sign/signers';
import { sign } from './sign/sign';

async function main() {
  const appSettings = await ConfigService.load();

  const banner = `${appSettings.app.name} Version ${appSettings.app.version}`;

  // Parse command line arguments
  const args = process.argv.slice(2);
  const pdfPathIndex = args.findIndex(arg => !arg.startsWith('--'));

  // Flags for signing methods
  const useKeyVault = args.includes('--keyvault');
  const usePem = args.includes('--pem');
  const useP12 = args.includes('--p12');

  // If no PDF path is provided or no signing method is specified, print usage and exit
  if ((pdfPathIndex === -1) || (!useKeyVault && !usePem && !useP12)) {
    console.log(banner);
    console.log('Usage: node dist/main [--keyvault] [--pem] [--p12] <pdfPath>');
    process.exit(1);
  }

  // Check if the signing methods are configured
  if (useKeyVault && !appSettings.azureKeyVault) {
    console.log(banner);
    console.log('The KeyVault signing method is not configured.');
    process.exit(1);
  } else if (usePem && !appSettings.pemCertificate) {
    console.log(banner);
    console.log('The PEM signing method is not configured.');
    process.exit(1);
  } else if (useP12 && !appSettings.p12Certificate?.path) {
    console.log(banner);
    console.log('The P12 signing method is not configured.');
    process.exit(1);
  }

  const pdfPath = args[pdfPathIndex];

  // Check if the PDF file exists and is readable
  try {
    await access(pdfPath, constants.R_OK);
  } catch (error) {
    console.log(banner);
    console.log(`The file does not exist or is not readable: ${pdfPath}`);
    process.exit(1);
  }

  // We're ready to go
  const logger = new Logger(appSettings.logger.directory, appSettings.logger.file);

  logger.log(banner);
  logger.log(`Start the signing process with PDF: ${pdfPath}`);

  try {
    const inBuffer = await readFile(pdfPath);
    logger.log(' > PDF loaded');

    if (useKeyVault && appSettings.azureKeyVault) {
      logger.log(' > Signing with the KeyVault...');
      const keyVaultService = new AzureKeyVaultService(appSettings.azureKeyVault);
      const cryptoClient = await keyVaultService.getCyptopgraphyClient();
      const fullchain = await keyVaultService.getCertificateFullChain();

      const signer = new KeyVaultSigner(cryptoClient, fullchain);
      const signed = await sign(inBuffer, signer, appSettings.signatureOptions);

      const signedPath = pdfPath.replace(/\.pdf$/i, '') + '_keyvault_signed.pdf';
      await writeFile(signedPath, signed);
      logger.log(`KeyVault signing complete: ${signedPath}`);
    }

    if (usePem && appSettings.pemCertificate?.keyPath && appSettings.pemCertificate.fullChainPath) {
      logger.log(' > Signing with the PEM certificate and private key...');
      const key = await readFile(appSettings.pemCertificate.keyPath);
      const fullchain = await readFile(appSettings.pemCertificate.fullChainPath);

      const signer = new PemSigner(key, fullchain);
      const signed = await sign(inBuffer, signer, appSettings.signatureOptions);

      const signedPath = pdfPath.replace(/\.pdf$/i, '') + '_pem_signed.pdf';
      await writeFile(signedPath, signed);
      logger.log(`PEM signing complete: ${signedPath}`);
    }

    if (useP12 && appSettings.p12Certificate?.path) {
      logger.log(' > Signing with the P12 certificate...');
      const cert = await readFile(appSettings.p12Certificate.path);

      const signer = new P12Signer(cert);
      const signed = await sign(inBuffer, signer, appSettings.signatureOptions);

      const signedPath = pdfPath.replace(/\.pdf$/i, '') + '_p12_signed.pdf';
      await writeFile(signedPath, signed);
      logger.log(`P12 signing complete: ${signedPath}`);
    }

  } catch (error) {
    logger.error(`An error occurred during the signing process: ${error}`);
    process.exit(1);
  }
}

main();
