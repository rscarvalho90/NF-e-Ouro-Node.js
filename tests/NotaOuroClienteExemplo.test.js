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
Object.defineProperty(exports, "__esModule", { value: true });
const NotaOuroCliente_1 = require("../src/model/NotaOuroCliente");
const AmbienteEnum_1 = require("../src/enum/AmbienteEnum");
const senha_certificado = 'senha1';
const ambiente = AmbienteEnum_1.AmbienteEnum.HOMOLOGACAO;
const pathCertificado = 'res/certificados_homologacao/Cert_03763656000154.p12';
describe("Testes", () => {
    test('Teste Envio DAO', () => __awaiter(void 0, void 0, void 0, function* () {
        const notaOuroCliente = new NotaOuroCliente_1.NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = yield notaOuroCliente.enviaDao("tests/exemplos/exDaoPrimeiraVenda01.xml");
    }));
    test('Teste Consulta por NSU', () => __awaiter(void 0, void 0, void 0, function* () {
        const notaOuroCliente = new NotaOuroCliente_1.NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = yield notaOuroCliente.consultaPorNsu(10);
    }));
    test('Teste Consulta por Chave', () => __awaiter(void 0, void 0, void 0, function* () {
        const notaOuroCliente = new NotaOuroCliente_1.NotaOuroCliente(ambiente, pathCertificado, senha_certificado);
        const axiosResponse = yield notaOuroCliente.consultaPorChave("3106200037636560001540010001770000000106");
    }));
});
