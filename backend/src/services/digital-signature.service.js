const forge = require('node-forge');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DigitalSignatureService {
  constructor() {
    this.certificatesPath = path.join(__dirname, '../../certificates');
    this.defaultCertificate = process.env.DEFAULT_CERTIFICATE_PATH;
    this.defaultPassword = process.env.DEFAULT_CERTIFICATE_PASSWORD;
  }

  /**
   * Initialize certificate storage
   */
  async initializeCertificateStorage() {
    try {
      await fs.access(this.certificatesPath);
    } catch (error) {
      await fs.mkdir(this.certificatesPath, { recursive: true });
    }
  }

  /**
   * Generate a self-signed certificate for testing/demo purposes
   */
  async generateTestCertificate(organizationInfo = {}) {
    try {
      const keys = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();
      
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

      const attrs = [
        { name: 'countryName', value: organizationInfo.country || 'RO' },
        { name: 'stateOrProvinceName', value: organizationInfo.state || 'Sibiu' },
        { name: 'localityName', value: organizationInfo.city || 'Sibiu' },
        { name: 'organizationName', value: organizationInfo.organization || 'Universitatea Lucian Blaga din Sibiu' },
        { name: 'organizationalUnitName', value: organizationInfo.department || 'IT Department' },
        { name: 'commonName', value: organizationInfo.commonName || 'ULBS PDF Signer' }
      ];

      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: true
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        }
      ]);

      cert.sign(keys.privateKey);

      // Convert to PKCS#12 format
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        keys.privateKey,
        cert,
        'test_password',
        {
          generateLocalKeyId: true,
          friendlyName: 'ULBS Test Certificate'
        }
      );

      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const certPath = path.join(this.certificatesPath, 'test-certificate.p12');
      
      await fs.writeFile(certPath, Buffer.from(p12Der, 'binary'));

      return {
        certificatePath: certPath,
        password: 'test_password',
        certificate: cert,
        privateKey: keys.privateKey
      };
    } catch (error) {
      console.error('Error generating test certificate:', error);
      throw error;
    }
  }

  /**
   * Load certificate from file
   */
  async loadCertificate(certificatePath, password) {
    try {
      const p12Buffer = await fs.readFile(certificatePath);
      const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract certificate and private key
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag][0];
      
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];

      return {
        certificate: certBag.cert,
        privateKey: keyBag.key,
        p12Buffer: p12Buffer
      };
    } catch (error) {
      console.error('Error loading certificate:', error);
      throw new Error('Invalid certificate or password');
    }
  }

  /**
   * Create digital signature for PDF content
   */
  async createSignature(content, certificatePath, password) {
    try {
      const certData = await this.loadCertificate(certificatePath, password);
      
      // Create message digest
      const md = forge.md.sha256.create();
      md.update(content, 'binary');
      
      // Sign the digest
      const signature = certData.privateKey.sign(md);
      
      return {
        signature: forge.util.encode64(signature),
        certificate: forge.pki.certificateToPem(certData.certificate),
        timestamp: new Date().toISOString(),
        algorithm: 'SHA256withRSA'
      };
    } catch (error) {
      console.error('Error creating signature:', error);
      throw error;
    }
  }

  /**
   * Verify digital signature
   */
  async verifySignature(content, signature, certificatePem) {
    try {
      const certificate = forge.pki.certificateFromPem(certificatePem);
      const decodedSignature = forge.util.decode64(signature);
      
      // Create message digest
      const md = forge.md.sha256.create();
      md.update(content, 'binary');
      
      // Verify signature
      const isValid = certificate.publicKey.verify(md.digest().bytes(), decodedSignature);
      
      return {
        isValid,
        certificate: {
          subject: certificate.subject.attributes.reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          issuer: certificate.issuer.attributes.reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          validity: {
            notBefore: certificate.validity.notBefore,
            notAfter: certificate.validity.notAfter
          },
          serialNumber: certificate.serialNumber
        }
      };
    } catch (error) {
      console.error('Error verifying signature:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Add signature metadata to PDF
   */
  async addSignatureMetadata(pdfBuffer, signatureData, signerInfo = {}) {
    try {
      // Create signature metadata
      const metadata = {
        signer: signerInfo.name || 'Unknown',
        organization: signerInfo.organization || 'ULBS',
        timestamp: signatureData.timestamp,
        algorithm: signatureData.algorithm,
        certificate: {
          subject: signerInfo.subject || 'N/A',
          serialNumber: signatureData.serialNumber || 'N/A'
        }
      };

      // For now, we'll add this as a comment in the PDF
      // In a production environment, you'd want to embed this in the PDF structure
      const metadataComment = `% Digital Signature Metadata: ${JSON.stringify(metadata)}`;
      const pdfString = pdfBuffer.toString('binary');
      const modifiedPdfString = pdfString.replace(/%%EOF/, `${metadataComment}\n%%EOF`);
      
      return Buffer.from(modifiedPdfString, 'binary');
    } catch (error) {
      console.error('Error adding signature metadata:', error);
      throw error;
    }
  }

  /**
   * Generate signature hash for document verification
   */
  generateDocumentHash(pdfBuffer) {
    return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  }

  /**
   * Create a signature record for database storage
   */
  async createSignatureRecord(documentId, signatureData, signerInfo) {
    return {
      documentId,
      signatureHash: signatureData.signature,
      certificateInfo: signatureData.certificate,
      timestamp: signatureData.timestamp,
      algorithm: signatureData.algorithm,
      signerInfo: {
        userId: signerInfo.userId,
        name: signerInfo.name,
        email: signerInfo.email,
        role: signerInfo.role
      },
      verificationUrl: `${process.env.FRONTEND_URL}/verify/signature/${documentId}`,
      isValid: true
    };
  }

  /**
   * Batch sign multiple documents
   */
  async batchSignDocuments(documents, certificatePath, password, signerInfo) {
    const results = [];
    
    try {
      const certData = await this.loadCertificate(certificatePath, password);
      
      for (const doc of documents) {
        try {
          const signatureData = await this.createSignature(
            doc.content, 
            certificatePath, 
            password
          );
          
          const signedBuffer = await this.addSignatureMetadata(
            doc.buffer, 
            signatureData, 
            signerInfo
          );
          
          const signatureRecord = await this.createSignatureRecord(
            doc.id, 
            signatureData, 
            signerInfo
          );
          
          results.push({
            documentId: doc.id,
            success: true,
            signedBuffer,
            signatureRecord,
            documentHash: this.generateDocumentHash(signedBuffer)
          });
        } catch (error) {
          results.push({
            documentId: doc.id,
            success: false,
            error: error.message
          });
        }
      }
    } catch (error) {
      throw new Error(`Certificate error: ${error.message}`);
    }
    
    return results;
  }

  /**
   * Validate certificate chain
   */
  async validateCertificateChain(certificatePath, password) {
    try {
      const certData = await this.loadCertificate(certificatePath, password);
      const cert = certData.certificate;
      
      // Basic validation checks
      const now = new Date();
      const isExpired = now > cert.validity.notAfter;
      const isNotYetValid = now < cert.validity.notBefore;
      
      // Check if certificate is self-signed
      const isSelfSigned = cert.isIssuer(cert);
      
      return {
        isValid: !isExpired && !isNotYetValid,
        isExpired,
        isNotYetValid,
        isSelfSigned,
        validFrom: cert.validity.notBefore,
        validTo: cert.validity.notAfter,
        subject: cert.subject.attributes.reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
        issuer: cert.issuer.attributes.reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Create timestamp for document signing
   */
  createTimestamp() {
    return {
      timestamp: new Date().toISOString(),
      epoch: Math.floor(Date.now() / 1000),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Get certificate information
   */
  async getCertificateInfo(certificatePath, password) {
    try {
      const validation = await this.validateCertificateChain(certificatePath, password);
      
      return {
        ...validation,
        path: certificatePath,
        hasPassword: !!password
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DigitalSignatureService();
