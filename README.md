# PDF Signing Tool

PDF Signing Tool is a TypeScript-based Node.js application designed as a demonstration of digitally signing PDF documents using the [node-forge](https://github.com/digitalbazaar/forge) library, utilizing various sources for the digital certificate such as the Azure Key Vault, PEM certificates, or P12 (PFX) certificates. While the actual signing is performed using `node-forge`, this project includes significant contributions from the [@signpdf/signpdf](https://github.com/vbuch/node-signpdf) and [pdf-lib](https://github.com/Hopding/pdf-lib) projects.

## Features

- Sign PDF documents using an Azure Key Vault certificate.
- Sign PDF documents using a PEM certificate.
- Sign PDF documents using a P12 certificate.
- Customizable signature options including signer info and page positioning.

## Background

This project demonstrates PDF signing using the `node-forge` library, with particular focus on asynchronous signing via external providers. In the same spirit as the `@signpdf` project, the goal is to synthesize a number of concepts into working code. The project is written in TypeScript to enhance clarity and readability.

The core ideas are contained within the `sign` directory. The remainder of the code serves as a wrapper, enabling use as a command-line tool.

This project incorporates functionality and examples from the `node-forge`, `@signpdf/signpdf`, and `pdf-lib` projects. It also benefits from key insights from discussions within their respective issue trackers. Additionally, various online resources about digital signing were instrumental in clarifying the PDF signing process. Below is a list of resources and discussions that were particularly useful:

- [Digital Signatures in a PDF](https://www.adobe.com/devnet-docs/acrobatetk/tools/DigSig/Acrobat_DigitalSignatures_in_PDF.pdf) - A white paper by Adobe Systems.
- [Digital Signatures for PDF documents](https://itextpdf.com/sites/default/files/2018-12/digitalsignatures20130304.pdf) - A white paper by Bruno Lowagie (iText Software).
- [e-Signature standards](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/Standards+and+specifications) - e-Signature standards from the European Commission.
- [Support asynchronous key signing (and other methods)](https://github.com/digitalbazaar/forge/issues/861) - A discussion on the `node-forge` issue tracker about asynchronous signing, including sample code.
- [Create a pkcs#7 signature with a pkcs#11 token](https://github.com/digitalbazaar/forge/issues/729) - A discussion on the `node-forge` issue tracker regarding signing with a PKCS#11 token.
- [Sign PDF with external service returning signature + certificate from hash (no private key access)](https://github.com/vbuch/node-signpdf/issues/46) - A discussion on the `@signpdf/signpdf` issue tracker about asynchronous signing.
- [How to create a byte-range for a digital signature](https://github.com/Hopding/pdf-lib/issues/112) - A discussion on the `pdf-lib` issue tracker that provides a template for creating a PDF 1.7 compliant signature placeholder.
- [How to digitally sign a PDF programmatically using Javascript/Node.js](https://medium.com/caution-your-blast/how-to-digitally-sign-a-pdf-programmatically-using-javascript-nodejs-54194af7bdc3) - An article by [Richard Oliver Bray](https://github.com/RichardBray) that provided the starting point for this project.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed on your system.
- Access to Azure Key Vault if using Key Vault signing.
- PEM or P12 certificates if using PEM or P12 signing methods.

## Installation

To install PDF Signing Tool, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the cloned directory.
3. Install the dependencies using npm:

```bash
npm install
```

4. Build the TypeScript files to JavaScript using the build script:

```bash
npm run build
```

## Configuration

To configure the application, you will need to set up the `.env` file and the `app-settings.json` file.

### .env File

Create a `.env` file in the root directory of the project with the following content:

```env
APP_SETTINGS_FILE=config/app-settings.json
```

### app-settings.json File

Create a `app-settings.json` file in the specified directory (e.g., `config/`) with the following structure. Adjust the content as necessary:

```json
{
  "app": {
    "name": "PDF Signing Tool",
    "version": "1.0.0"
  },
  "logger": {
    "directory": "logs",
    "file": "pdf-sign.log"
  },
  "azureKeyVault": {
    "vaultName": "xxxx",
    "tenantId": "xxxx",
    "clientId": "xxxx",
    "clientCertificateFile": "path/to/azure-cert.pem",
    "clientSecret": "xxxx",
    "certificateName": "xxxx",
    "certificateFullChainName": "xxxx"
  },
  "pemCertificate": {
    "fullChainPath": "/path/to/fullchain.pem",
    "keyPath": "/path/to/privkey.pem"
  },
  "p12Certificate": {
    "path": "/path/to/cert.p12",
    "password": ""
  },
  "signatureOptions": {
    "name": "xxxx",
    "location": "xxxx",
    "contact": "xxxx@xxxx.com",
    "reason": "xxxx",
    "fontSize": 5,
    "xPosition": 420,
    "yPosition": 745,
    "width": 180,
    "height": 35
  }
}
```

## Usage

The PDF Signing Tool provides a command-line interface to control the signing process. To use, start the application with the following command:

```bash
npm start -- [options] <pdfPath>
```

Or alternatively, build then run using the following commands:

```bash
npm run build
node dist/main [options] <pdfPath>
```

Options:
- `--keyvault`: Use Azure Key Vault for signing the PDF.
- `--pem`: Use a PEM certificate for signing the PDF.
- `--p12`: Use a P12 certificate for signing the PDF.

Example:

```bash
node dist/main --keyvault --pem /path/to/document.pdf
```

## Contributing

This project is primarily a demonstration of extending the capabilities of the `node-forge` library to include asynchronous signing and integration with external signing providers such as Azure KeyVault. It is not intended for active development or contributions. You are welcome to fork the project, adapt the code, and use it in your own projects under the terms of the license. There is no expectation of future updates or contributions back to this repository.

## License

PDF Signing Tool is open-sourced under the MIT License. See the `LICENSE` file for more details. This project includes code from libraries that are under their own licenses:

- `node-forge` - BSD or GPL-2.0 License
- `@signpdf/utils` - MIT License
- `pdf-lib` - MIT License
- `winston` - MIT License
- `dotenv` - BSD-2-Clause License
- Microsoft Azure libraries - MIT License

When using this project, please ensure that you comply with the respective licenses of these libraries. The BSD License has been chosen for `node-forge` to avoid the copyleft restrictions of the GPL.

## Acknowledgements

This project was made possible by incorporating functionality and examples from the `node-forge`, `@signpdf/signpdf`, and `pdf-lib` projects, alongside insights from their issue tracker discussions which were crucial for implementing asynchronous signing and integrating external signing providers.

The [Medium article](https://medium.com/caution-your-blast/how-to-digitally-sign-a-pdf-programmatically-using-javascript-nodejs-54194af7bdc3) by Richard Oliver Bray also provided a foundational starting point that helped to frame the initial problem and suggested an approach.

## Author

Stephen Lee
