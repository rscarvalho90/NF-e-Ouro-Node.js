import {AmbienteEnum} from "../enum/AmbienteEnum";
import axios, {AxiosResponse} from "axios";
import fs from "fs";
import pem, {Pkcs12ReadResult} from "pem";
import SignedXml from "xml-crypto"
import gzip from "node-gzip"
import https from "https";
import xml2js from "xml2js";

export class NotaOuroCliente {

    /**
     * @param ambiente Ambiente em que o serviço será executado.
     * @param pathCertificado Local, na estação de execução do serviço, em que encontra-se o certificado para assinatura do XML.
     * @param senhaCertificado Senha do arquivo do certificado.
     */
    constructor(private ambiente: AmbienteEnum, private pathCertificado: string, private senhaCertificado: string) {

    }

    /**
     * Envia um XML contendo uma DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param xmlPath Path (local, caminho) do arquivo XML a ser enviado.
     * @return
     */
    async enviaDao(xmlPath: string): Promise<AxiosResponse<any, any>> {
        let xmlAssinado = await this.assinaXml(xmlPath);

        xmlAssinado = this.finalizaXml(xmlAssinado);
        const xmlAssinadoGzipBase64 = Buffer.from(await gzip.gzip(xmlAssinado)).toString("base64");

        return await axios.post(this.ambiente + "/nfeouro",
            {XmlGzipDao: xmlAssinadoGzipBase64},
            await this.getConfiguracoesHttpAxios());
    }

    /**
     * Consulta um XML contendo uma NF-e Ouro e seu DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param nsuRecepcao NSU da NF-e Ouro.
     */
    async consultaPorNsu(nsuRecepcao: number): Promise<AxiosResponse<any, any>> {

        return await axios.get(this.ambiente + "/nsu/" + nsuRecepcao + "/nfeouro",
            await this.getConfiguracoesHttpAxios());
    }

    /**
     * Consulta um XML contendo uma NF-e Ouro e seu DAO (Declaração de Aquisição de Ouro ativo financeiro).
     *
     * @param chaveAcesso Chave de acesso da NF-e Ouro.
     */
    async consultaPorChave(chaveAcesso: string): Promise<AxiosResponse<any, any>> {
        return await axios.get(this.ambiente + "/nfeouro/" + chaveAcesso,
            await this.getConfiguracoesHttpAxios());
    }

    /**
     * Assina um XML com certificado do tipo A1.
     *
     * @param xmlPath Path (local, caminho) do arquivo XML a ser enviado.
     * @private
     */
    private async assinaXml(xmlPath: string): Promise<string> {
        // Importa um certificado tipo A1
        const certBuffer: Buffer = fs.readFileSync(this.pathCertificado);

        // Configura os dados do certificado
        const dadosPkcs12 = await this.getDadosPkcs12(certBuffer);
        const chavePrivadaConfigurada: string = dadosPkcs12.key;

        // Configura o assinador
        let assinador = new SignedXml.SignedXml();

        const transforms = [
            'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
            'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
        ];

        assinador.addReference("//*[local-name(.)='infDAO']",transforms,"","","","", false);
        assinador.signingKey = Buffer.from(chavePrivadaConfigurada);
        assinador.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
        assinador.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
        assinador.keyInfoProvider = new KeyInfoProvider(dadosPkcs12.cert);

        // Abre o XML a ser assinado
        const xmlString: string = this.configuraXml(fs.readFileSync(xmlPath, "utf8"));

        // Assina o XML
        assinador.computeSignature(xmlString);

        return assinador.getSignedXml();
    }

    /**
     * Retorna as configurações HTTP do Axios.
     * @private
     */
    private async getConfiguracoesHttpAxios(): Promise<any> {
        // Importa um certificado tipo A1
        const certBuffer: Buffer = fs.readFileSync(this.pathCertificado);
        const dadosPkcs12 = await this.getDadosPkcs12(certBuffer);

        const certificadoBase64 = Buffer.from(dadosPkcs12.cert, "utf-8").toString("base64");
        const ip = await this.getIp();

        const httpsAgent = new https.Agent({
            cert: dadosPkcs12.cert,
            key: dadosPkcs12.key,
            ca: dadosPkcs12.ca,
            keepAlive: false,
            rejectUnauthorized: false
        });

        return  {
            headers: {
                "X-SSL-Client-Cert": certificadoBase64,
                "X-ARR-ClientCert": certificadoBase64,
                "X-Forwarded-For": ip,
                "Content-Type": 'application/json'
            },
            httpsAgent: httpsAgent
        };
    }

    /**
     * Faz as inserções não disponibilizadas por padrão pela biblioteca **SignedXml** do pacote *xml-crypto*.
     * Estas inserções permitem que o XML esteja no formato esperado pela API do Serpro.
     *
     * @param xmlTxt XML a ser finalizado em formato *string*
     * @private
     */
    private finalizaXml(xmlTxt: string): string {
        xml2js.parseString(xmlTxt, (erro, resultado) => {
            resultado.DAO.Signature[0].SignedInfo[0].Reference[0].Transforms[0].Transform[0] = {$: {Algorithm: "http://www.w3.org/2000/09/xmldsig#enveloped-signature"}};
            resultado.DAO.Signature[0].SignedInfo[0].Reference[0].Transforms[0].Transform[1] = {$: {Algorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"}};
            const builder = new xml2js.Builder({renderOpts: {pretty: false}});

            xmlTxt = builder.buildObject(resultado);
        });

        return xmlTxt;
    }

    /**
     * Retorna os dados do certificado PKCS12.
     * @param certBuffer Buffer do certificado (pode ser obtido pelo método "fs.readFileSync")
     * @private
     */
    private async getDadosPkcs12(certBuffer: Buffer): Promise<Pkcs12ReadResult> {
        return new Promise(async (resolve, reject) => {
            pem.readPkcs12(certBuffer, {p12Password: this.senhaCertificado}, (err, cert) => {
                resolve(cert);
            });
        });
    }

    /**
     * Configura o XML antes da assinatura.
     *
     * @param xmlTxt XML, em formato String, a ser configurado.
     * @private
     */
    private configuraXml(xmlTxt: string): string {
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
    private async getIp(): Promise<string> {
        let jsonResposta = (await axios.get("https://api.myip.com")).data;

        return jsonResposta["ip"] as string;
    }
}

/**
 * Configura o xml-crypto para inserir os dados do certificado X509 na assinatura.
 */
class KeyInfoProvider {
    private file: string = "";

    constructor(public cert: string) {

    }

    getKeyInfo(key?: string, prefix?: string): string {
        this.cert = this.cert.replace(/\n/g, "");
        this.cert = this.cert.replace("-----BEGIN CERTIFICATE-----", "");
        this.cert = this.cert.replace("-----END CERTIFICATE-----", "");

        return `<X509Data><X509Certificate>${this.cert}</X509Certificate></X509Data>`;
    };

    getKey(keyInfo?: Node[] | null): Buffer {
        return Buffer.from(this.cert);
    };

}
