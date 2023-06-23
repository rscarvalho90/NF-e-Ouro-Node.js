"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotaOuroCliente = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const pem_1 = __importDefault(require("pem"));
const xml_crypto_1 = __importDefault(require("xml-crypto"));
const node_gzip_1 = __importDefault(require("node-gzip"));
const https_1 = __importDefault(require("https"));
const xml2js_1 = __importDefault(require("xml2js"));
class NotaOuroCliente {
    /**
     * @param ambiente Ambiente em que o serviço será executado.
     * @param pathCertificado Local, na estação de execução do serviço, em que encontra-se o certificado para assinatura do XML.
     * @param senhaCertificado Senha do arquivo do certificado.
     */
    constructor(ambiente, pathCertificado, senhaCertificado) {
        this.ambiente = ambiente;
        this.pathCertificado = pathCertificado;
        this.senhaCertificado = senhaCertificado;
    }
    /**
     * Envia um XML contendo uma DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param xmlPath Path (local, caminho) do arquivo XML a ser enviado.
     * @return
     */
    enviaDao(xmlPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let xmlAssinado = yield this.assinaXml(xmlPath);
            xmlAssinado = this.finalizaXml(xmlAssinado);
            const xmlAssinadoGzipBase64 = Buffer.from(yield node_gzip_1.default.gzip(xmlAssinado)).toString("base64");
            return yield axios_1.default.post(this.ambiente + "/nfeouro", { XmlGzipDao: xmlAssinadoGzipBase64 }, yield this.getConfiguracoesHttpAxios());
        });
    }
    /**
     * Consulta um XML contendo uma NF-e Ouro e seu DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param nsuRecepcao NSU da NF-e Ouro.
     */
    consultaPorNsu(nsuRecepcao) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield axios_1.default.get(this.ambiente + "/nsu/" + nsuRecepcao + "/nfeouro", yield this.getConfiguracoesHttpAxios());
        });
    }
    /**
     * Consulta um XML contendo uma NF-e Ouro e seu DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param chaveAcesso Chave de acesso da NF-e Ouro.
     */
    consultaPorChave(chaveAcesso) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield axios_1.default.get(this.ambiente + "/nfeouro/" + chaveAcesso, yield this.getConfiguracoesHttpAxios());
        });
    }
    /**
     * Assina um XML com certificado do tipo A1.
     *
     * @param xmlPath Path (local, caminho) do arquivo XML a ser enviado.
     * @private
     */
    assinaXml(xmlPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Importa um certificado tipo A1
            const certBuffer = fs_1.default.readFileSync(this.pathCertificado);
            // Configura os dados do certificado
            const dadosPkcs12 = yield this.getDadosPkcs12(certBuffer);
            const chavePrivadaConfigurada = dadosPkcs12.key;
            // Configura o assinador
            let assinador = new xml_crypto_1.default.SignedXml();
            const transforms = [
                'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
                'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
            ];
            assinador.addReference("//*[local-name(.)='infDAO']", transforms, "", "", "", "", false);
            assinador.signingKey = Buffer.from(chavePrivadaConfigurada);
            assinador.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
            assinador.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
            assinador.keyInfoProvider = new KeyInfoProvider(dadosPkcs12.cert);
            // Abre o XML a ser assinado
            const xmlString = this.configuraXml(fs_1.default.readFileSync(xmlPath, "utf8"));
            // Assina o XML
            assinador.computeSignature(xmlString);
            return assinador.getSignedXml();
        });
    }
    /**
     * Retorna as configurações HTTP do Axios.
     * @private
     */
    getConfiguracoesHttpAxios() {
        return __awaiter(this, void 0, void 0, function* () {
            // Importa um certificado tipo A1
            const certBuffer = fs_1.default.readFileSync(this.pathCertificado);
            const dadosPkcs12 = yield this.getDadosPkcs12(certBuffer);
            const certificadoBase64 = Buffer.from(dadosPkcs12.cert, "utf-8").toString("base64");
            const ip = yield this.getIp();
            const httpsAgent = new https_1.default.Agent({
                cert: dadosPkcs12.cert,
                key: dadosPkcs12.key,
                ca: dadosPkcs12.ca,
                keepAlive: false,
                rejectUnauthorized: false
            });
            return {
                headers: {
                    "X-SSL-Client-Cert": certificadoBase64,
                    "X-ARR-ClientCert": certificadoBase64,
                    "X-Forwarded-For": ip,
                    "Content-Type": 'application/json'
                },
                httpsAgent: httpsAgent
            };
        });
    }
    /**
     * Faz as inserções não disponibilizadas por padrão pela biblioteca **SignedXml** do pacote *xml-crypto*.
     * Estas inserções permitem que o XML esteja no formato esperado pela API do Serpro.
     *
     * @param xmlTxt XML a ser finalizado em formato *string*
     * @private
     */
    finalizaXml(xmlTxt) {
        xml2js_1.default.parseString(xmlTxt, (erro, resultado) => {
            resultado.DAO.Signature[0].SignedInfo[0].Reference[0].Transforms[0].Transform[0] = { $: { Algorithm: "http://www.w3.org/2000/09/xmldsig#enveloped-signature" } };
            resultado.DAO.Signature[0].SignedInfo[0].Reference[0].Transforms[0].Transform[1] = { $: { Algorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" } };
            const builder = new xml2js_1.default.Builder({ renderOpts: { pretty: false } });
            xmlTxt = builder.buildObject(resultado);
        });
        return xmlTxt;
    }
    /**
     * Retorna os dados do certificado PKCS12.
     * @param certBuffer Buffer do certificado (pode ser obtido pelo método "fs.readFileSync")
     * @private
     */
    getDadosPkcs12(certBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                pem_1.default.readPkcs12(certBuffer, { p12Password: this.senhaCertificado }, (err, cert) => {
                    resolve(cert);
                });
            }));
        });
    }
    /**
     * Configura o XML antes da assinatura.
     *
     * @param xmlTxt XML, em formato String, a ser configurado.
     * @private
     */
    configuraXml(xmlTxt) {
        xmlTxt = xmlTxt.replace(/\r/g, "");
        xmlTxt = xmlTxt.replace(/\n/g, "");
        xmlTxt = xmlTxt.replace(/\t/g, "");
        return xmlTxt;
    }
    /**
     * Retorna o IP (público) atual do cliente.
     *
     * @private
     */
    getIp() {
        return __awaiter(this, void 0, void 0, function* () {
            let jsonResposta = (yield axios_1.default.get("https://api.myip.com")).data;
            return jsonResposta["ip"];
        });
    }
}
exports.NotaOuroCliente = NotaOuroCliente;
/**
 * Configura o xml-crypto para inserir os dados do certificado X509 na assinatura.
 */
class KeyInfoProvider {
    constructor(cert) {
        this.cert = cert;
        this.file = "";
    }
    getKeyInfo(key, prefix) {
        this.cert = this.cert.replace(/\n/g, "");
        this.cert = this.cert.replace("-----BEGIN CERTIFICATE-----", "");
        this.cert = this.cert.replace("-----END CERTIFICATE-----", "");
        return `<X509Data><X509Certificate>${this.cert}</X509Certificate></X509Data>`;
    }
    ;
    getKey(keyInfo) {
        return Buffer.from(this.cert);
    }
    ;
}
