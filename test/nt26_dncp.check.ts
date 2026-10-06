/**
 * NT 26 (DNIT): los datos de la DNCP son opcionales para el tipo de operación B2G (D202=3).
 *   - E020 gCompPub: 0-1, se excluyen los rechazos 1400 y 1401.
 *   - E704 dDncpG / E705 dDncpE: 0-1, se excluyen los rechazos 1800 y 1801.
 *
 * Correr con: npx ts-node test/nt26_dncp.check.ts
 */
import assert from 'assert';
import xmlgen from '../src/index';

const params = {
  version: 150,
  ruc: '80069563-1',
  razonSocial: 'DE generado en ambiente de prueba - sin valor comercial ni fiscal',
  nombreFantasia: 'Prueba',
  actividadesEconomicas: [{ codigo: '62010', descripcion: 'ACTIVIDADES DE PROGRAMACIÓN INFORMÁTICA' }],
  timbradoNumero: '12558946',
  timbradoFecha: '2022-08-25',
  tipoContribuyente: 2,
  tipoRegimen: 8,
  establecimientos: [
    {
      codigo: '001',
      direccion: 'Barrio Carolina',
      numeroCasa: '0',
      departamento: 11,
      departamentoDescripcion: 'ALTO PARANA',
      distrito: 145,
      distritoDescripcion: 'CIUDAD DEL ESTE',
      ciudad: 3432,
      ciudadDescripcion: 'PUERTO PTE.STROESSNER (MUNIC)',
      telefono: '0973-527155',
      email: 'prueba@prueba.com',
      denominacion: 'Sucursal 1',
    },
  ],
};

const baseData = (tipoOperacion: number, dncp?: any, itemDncp?: any) => {
  const item: any = {
    codigo: 'A-001',
    descripcion: 'Producto',
    unidadMedida: 77,
    cantidad: 1,
    precioUnitario: 10000,
    pais: 'PRY',
    paisDescripcion: 'Paraguay',
    ivaTipo: 1,
    ivaBase: 100,
    iva: 10,
  };
  if (itemDncp !== undefined) item.dncp = itemDncp;

  const data: any = {
    tipoDocumento: 1,
    establecimiento: '001',
    codigoSeguridadAleatorio: '298398',
    punto: '001',
    numero: '0000001',
    fecha: '2025-07-01T10:11:00',
    tipoEmision: 1,
    tipoTransaccion: 1,
    tipoImpuesto: 1,
    moneda: 'PYG',
    cliente: {
      contribuyente: true,
      ruc: '2005001-1',
      razonSocial: 'Entidad Pública',
      tipoOperacion,
      direccion: 'Avda Calle Segunda',
      numeroCasa: '0',
      departamento: 11,
      departamentoDescripcion: 'ALTO PARANA',
      distrito: 145,
      distritoDescripcion: 'CIUDAD DEL ESTE',
      ciudad: 3432,
      ciudadDescripcion: 'PUERTO PTE.STROESSNER (MUNIC)',
      pais: 'PRY',
      paisDescripcion: 'Paraguay',
      tipoContribuyente: 2,
    },
    factura: { presencia: 1 },
    condicion: { tipo: 1, entregas: [{ tipo: 1, monto: '10000', moneda: 'PYG', cambio: 0 }] },
    items: [item],
  };
  if (dncp !== undefined) data.dncp = dncp;
  return data;
};

const DNCP_COMPLETO = { modalidad: 'LP', entidad: '12345', año: '25', secuencia: '1234567', fecha: '2025-05-01' };

const generar = (data: any) => xmlgen.generateXMLDE(JSON.parse(JSON.stringify(params)), data, {} as any);

const casos: Array<[string, () => Promise<void>]> = [
  ['B2G sin dncp: sin gCompPub ni códigos por ítem', async () => {
    const xml = await generar(baseData(3));
    assert.ok(!xml.includes('<gCompPub>'), 'no debe generar gCompPub');
    assert.ok(!/<dDncpG>|<dDncpE>|<dGtin>|<dGtinPq>/.test(xml), 'no debe generar códigos DNCP por ítem');
  }],
  ['B2G con dncp {} y null: igual que sin dncp', async () => {
    for (const vacio of [{}, null]) {
      const xml = await generar(baseData(3, vacio, vacio));
      assert.ok(!xml.includes('<gCompPub>'));
      assert.ok(!/<dDncpG>|<dDncpE>/.test(xml));
    }
  }],
  ['B2G con dncp completo: gCompPub con los datos', async () => {
    const xml = await generar(baseData(3, DNCP_COMPLETO, { codigoNivelGeneral: '123', codigoNivelEspecifico: '456' }));
    assert.ok(xml.includes('<dModCont>LP</dModCont>') && xml.includes('<dSecCont>1234567</dSecCont>'));
    assert.ok(xml.includes('<dDncpG>00000123</dDncpG>') && xml.includes('<dDncpE>456</dDncpE>'));
  }],
  ['B2G con dncp incompleto: error de validación', async () => {
    await assert.rejects(generar(baseData(3, { modalidad: 'LP' })), /entidad de Contratación DNCP/);
  }],
  ['B2G con sólo el código general por ítem (1801 excluido)', async () => {
    const xml = await generar(baseData(3, undefined, { codigoNivelGeneral: '42' }));
    assert.ok(xml.includes('<dDncpG>00000042</dDncpG>'));
    assert.ok(!xml.includes('<dDncpE>'));
  }],
  ['B2G con código específico de 2 dígitos: error de validación', async () => {
    await assert.rejects(generar(baseData(3, undefined, { codigoNivelEspecifico: '12' })), /codigoNivelEspecifico/);
  }],
  ['No B2G: sin grupos DNCP', async () => {
    const xml = await generar(baseData(1));
    assert.ok(!xml.includes('<gCompPub>') && !xml.includes('<dDncpG>'));
  }],
];

(async () => {
  let fallas = 0;
  for (const [nombre, caso] of casos) {
    try {
      await caso();
      console.log(`ok   - ${nombre}`);
    } catch (e) {
      fallas++;
      console.log(`FAIL - ${nombre}: ${e?.message ?? e}`);
    }
  }
  if (fallas > 0) process.exit(1);
})();
