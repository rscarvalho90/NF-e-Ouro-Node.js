import {NotaOuroCliente} from "../src/model/NotaOuroCliente";
import {AmbienteEnum} from "../src/enum/AmbienteEnum";

const senha_certificado: string = 'senha1'
const ambiente: AmbienteEnum = AmbienteEnum.HOMOLOGACAO
const pathCertificado: string = 'res/certificados_homologacao/Cert_03763656000154.p12'

describe("Testes", () => {
    test('Teste Envio DAO', async () => {
        const notaOuroCliente: NotaOuroCliente = new NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = await notaOuroCliente.enviaDao("tests/exemplos/exDaoPrimeiraVenda01.xml");
    });

    test('Teste Consulta por NSU', async () => {
        const notaOuroCliente: NotaOuroCliente = new NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = await notaOuroCliente.consultaPorNsu(10);
    });

    test('Teste Consulta por Chave', async () => {
        const notaOuroCliente: NotaOuroCliente = new NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = await notaOuroCliente.consultaPorChave("3106200037636560001540010001770000000106");
    });
})
