"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StringUtil_service_1 = __importDefault(require("./StringUtil.service"));
const constants_service_1 = __importDefault(require("./constants.service"));
class JSonDteItemService {
    /**
     * E8. Campos que describen los ítems de la operación (E700-E899)
     *
     * @param params
     * @param data
     * @param options
     */
    generateDatosItemsOperacion(params, data, config) {
        const jsonResult = [];
        //Recorrer array de infoCuotas e informar en el JSON
        if (data['items'] && data['items'].length > 0) {
            for (let i = 0; i < data['items'].length; i++) {
                const item = data['items'][i];
                const gCamItem = {
                    dCodInt: item['codigo'],
                };
                if (item['partidaArancelaria']) {
                    gCamItem['dParAranc'] = item['partidaArancelaria'];
                }
                if (item['ncm']) {
                    gCamItem['dNCM'] = item['ncm'];
                }
                if (data['cliente']['tipoOperacion'] && data['cliente']['tipoOperacion'] === 3) {
                    if (item['dncp'] && item['dncp']['codigoNivelGeneral']) {
                        gCamItem['dDncpG'] = StringUtil_service_1.default.leftZero(item['dncp']['codigoNivelGeneral'], 8);
                    }
                    if (item['dncp'] && item['dncp']['codigoNivelEspecifico']) {
                        gCamItem['dDncpE'] = item['dncp']['codigoNivelEspecifico'];
                    }
                    //}
                    //if (data['cliente']['tipoOperacion'] && data['cliente']['tipoOperacion'] === 3) {
                    if (item['dncp'] && item['dncp']['codigoGtinProducto']) {
                        gCamItem['dGtin'] = item['dncp']['codigoGtinProducto'];
                    }
                    if (item['dncp'] && item['dncp']['codigoNivelPaquete']) {
                        gCamItem['dGtinPq'] = item['dncp']['codigoNivelPaquete'];
                    }
                }
                gCamItem['dDesProSer'] = item['descripcion']; // RG 24/2019
                gCamItem['cUniMed'] = item['unidadMedida'];
                gCamItem['dDesUniMed'] = constants_service_1.default.unidadesMedidas
                    .filter((um) => um.codigo === +item['unidadMedida'])[0]['representacion'].trim();
                gCamItem['dCantProSer'] = item['cantidad'];
                if (item['pais']) {
                    gCamItem['cPaisOrig'] = item['pais'];
                    gCamItem['dDesPaisOrig'] = constants_service_1.default.paises.filter((pais) => pais.codigo === item['pais'])[0]['descripcion'];
                }
                if (item['observacion'] && (item['observacion'] + '').trim().length > 0) {
                    gCamItem['dInfItem'] = (item['observacion'] + '').trim();
                }
                if (data['tipoDocumento'] === 7) {
                    if (item['tolerancia']) {
                        gCamItem['cRelMerc'] = +item['tolerancia'];
                        if (constants_service_1.default.relevanciasMercaderias.filter((um) => um.codigo === +item['tolerancia']).length > 0) {
                            gCamItem['dDesRelMerc'] = constants_service_1.default.relevanciasMercaderias.filter((um) => um.codigo === +item['tolerancia'])[0]['descripcion'];
                        }
                        if (item['toleranciaCantidad']) {
                            gCamItem['dCanQuiMer'] = item['toleranciaCantidad'];
                        }
                        if (item['toleranciaPorcentaje']) {
                            gCamItem['dPorQuiMer'] = item['toleranciaPorcentaje'];
                        }
                    }
                }
                //Tratamiento E719. Tiene relacion con generateDatosGeneralesInherentesOperacion
                if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 4) {
                    //if (data['tipoTransaccion'] === 9) {
                    if (item['cdcAnticipo']) {
                        gCamItem['dCDCAnticipo'] = item['cdcAnticipo'];
                    }
                    //}
                }
                if (data['tipoDocumento'] != 7) {
                    //Oblitatorio informar
                    gCamItem['gValorItem'] = this.generateDatosItemsOperacionPrecioTipoCambioTotal(params, data, item, i, config);
                }
                if (data['tipoImpuesto'] == 1 ||
                    data['tipoImpuesto'] == 3 ||
                    data['tipoImpuesto'] == 4 ||
                    data['tipoImpuesto'] == 5) {
                    if (data['tipoDocumento'] != 4 && data['tipoDocumento'] != 7) {
                        gCamItem['gCamIVA'] = this.generateDatosItemsOperacionIVA(params, data, item, i, Object.assign({}, gCamItem), config);
                    }
                }
                //Rastreo
                if (item['lote'] ||
                    item['vencimiento'] ||
                    item['numeroSerie'] ||
                    item['numeroPedido'] ||
                    item['numeroSeguimiento'] ||
                    item['registroSenave'] ||
                    item['registroEntidadComercial']) {
                    gCamItem['gRasMerc'] = this.generateDatosItemsOperacionRastreoMercaderias(params, data, item, i);
                }
                //Automotores
                if (item['sectorAutomotor'] && item['sectorAutomotor']['tipo']) {
                    gCamItem['gVehNuevo'] = this.generateDatosItemsOperacionSectorAutomotores(params, data, item, i);
                }
                jsonResult.push(gCamItem);
            } //end-for
            //Verificacion de Totales de Descuento Global y Anticipo
            //Con los prorrateos pueden haber diferencias
            //Las diferencias se corrigen en el ultimo item
            let totalDescuentoGlobal = 0;
            let totalAnticipoGlobal = 0;
            if (data['descuentoGlobal'] > 0 || data['anticipoGlobal'] > 0) {
                for (let i = 0; i < jsonResult.length; i++) {
                    const gCamItem = jsonResult[i];
                    if (data['descuentoGlobal']) {
                        totalDescuentoGlobal += gCamItem['dCantProSer'] * gCamItem['gValorItem']['gValorRestaItem']['dDescGloItem'];
                    }
                    if (data['anticipoGlobal']) {
                        totalAnticipoGlobal +=
                            gCamItem['dCantProSer'] * gCamItem['gValorItem']['gValorRestaItem']['dAntGloPreUniIt'];
                    }
                }
                if (data['descuentoGlobal'] > 0) {
                    if (data['descuentoGlobal'] != totalDescuentoGlobal) {
                        console.log('hay una diferencia', data['descuentoGlobal'], totalDescuentoGlobal);
                        //throw new Error("hay una diferencia", data['descuentoGlobal'], totalDescuentoGlobal);
                    }
                }
                if (data['anticipoGlobal'] > 0) {
                    if (data['anticipoGlobal'] != totalDescuentoGlobal) {
                        console.log('hay una diferencia', data['anticipoGlobal'], totalAnticipoGlobal);
                        //throw new Error("hay una diferencia", data['anticipoGlobal'], totalDescuentoGlobal);
                    }
                }
            }
        }
        return jsonResult;
    }
    /**
     * E8.1. Campos que describen el precio, tipo de cambio y valor total de la operación por ítem (E720-E729)
     *
     * @param params
     * @param data
     * @param options
     * @param items Es el item actual del array de items de "data" que se está iterando
     */
    generateDatosItemsOperacionPrecioTipoCambioTotal(params, data, item, i, config) {
        const jsonResult = {};
        //Mejor no tocar como el usuario envia desde el JSON
        jsonResult['dPUniProSer'] = item['precioUnitario'];
        jsonResult['dTotBruOpeItem'] = parseFloat(jsonResult['dPUniProSer']) * parseFloat(item['cantidad']);
        //console.log("dTotBruOpeItem 1", jsonResult['dTotBruOpeItem']);
        if (config.sum0_000001SuffixBeforeToFixed == true) {
            jsonResult['dTotBruOpeItem'] += 0.000001;
        }
        jsonResult['dTotBruOpeItem'] = parseFloat(jsonResult['dTotBruOpeItem'].toFixed(config.decimals));
        //console.log("dTotBruOpeItem 2", jsonResult['dTotBruOpeItem']);
        if (data.moneda === 'PYG') {
            jsonResult['dTotBruOpeItem'] = parseFloat(jsonResult['dTotBruOpeItem'].toFixed(config.pygDecimals));
        }
        if (data['condicionTipoCambio'] && data['condicionTipoCambio'] == 2) {
            jsonResult['dTiCamIt'] = item['cambio'];
        }
        jsonResult['gValorRestaItem'] = this.generateDatosItemsOperacionDescuentoAnticipoValorTotal(params, data, item, i, config);
        return jsonResult;
    }
    /**
     * E8.1.1 Campos que describen los descuentos, anticipos y valor total por ítem (EA001-EA050)
     *
     * @param params
     * @param data
     * @param options
     * @param items Es el item actual del array de items de "data" que se está iterando
     */
    generateDatosItemsOperacionDescuentoAnticipoValorTotal(params, data, item, i, config) {
        const jsonResult = {};
        jsonResult['dDescItem'] = 0;
        if (item['descuento'] && +item['descuento'] > 0) {
            //El descuento por item se pasa asi mismo como viene en el JSON, sin redondeos, igual al precio
            jsonResult['dDescItem'] = item['descuento'];
            /*      //Validar que si el descuento es mayor al precio
            jsonResult['dDescItem'] = parseFloat(item['descuento']).toFixed(config.decimals);
      
            if (data.moneda === 'PYG') {
              jsonResult['dDescItem'] = parseFloat(jsonResult['dDescItem']).toFixed(config.pygDecimals);
            }
      */
            //FacturaSend calcula solo el % Descuento, no hace falta informar
            jsonResult['dPorcDesIt'] = Math.round((parseFloat(item['descuento']) * 100) / parseFloat(item['precioUnitario']));
        }
        let totalGeneral = 0;
        for (let i = 0; i < data['items'].length; i++) {
            const item2 = data['items'][i];
            totalGeneral += item2['cantidad'] * item2['precioUnitario'];
        }
        jsonResult['dDescGloItem'] = 0;
        if (data['descuentoGlobal'] && +data['descuentoGlobal'] > 0) {
            let subtotal = item['cantidad'] * item['precioUnitario'];
            let pesoPorc = (100 * subtotal) / totalGeneral;
            let descuentoGlobalAplicado = (data['descuentoGlobal'] * pesoPorc) / 100;
            let descuentoGlobalUnitario = descuentoGlobalAplicado / item['cantidad'];
            jsonResult['dDescGloItem'] = parseFloat(descuentoGlobalUnitario + '').toFixed(8); //Deja en el maximo permitido para que el calculo al final salga exacto
            if (data.moneda === 'PYG') {
                //jsonResult['dDescGloItem'] = parseFloat(jsonResult['dDescGloItem']).toFixed(config.pygDecimals);
            }
        }
        jsonResult['dAntPreUniIt'] = 0;
        if (item['anticipo'] && +item['anticipo'] > 0) {
            //jsonResult['dAntPreUniIt'] = parseFloat(item['anticipo']).toFixed(config.decimals);  //2026-05-29
            if (data.moneda === 'PYG') {
                //jsonResult['dAntPreUniIt'] = parseFloat(jsonResult['dAntPreUniIt']).toFixed(config.pygDecimals);  //2026-05-29
                jsonResult['dAntPreUniIt'] = parseFloat(item['anticipo']).toFixed(config.pygDecimals);
            }
            else {
                //Otras monedas
                jsonResult['dAntPreUniIt'] = parseFloat(item['anticipo']).toFixed(config.decimals);
            }
        }
        /*
        if (data['anticipoGlobal'] && +data['anticipoGlobal'] > 0) {
          jsonResult['dAntGloPreUniIt'] = parseFloat(data['anticipoGlobal']).toFixed(config.decimals);
        }*/
        jsonResult['dAntGloPreUniIt'] = 0;
        if (data['anticipoGlobal'] && +data['anticipoGlobal'] > 0) {
            let subtotal = item['cantidad'] * item['precioUnitario'];
            let pesoPorc = (100 * subtotal) / totalGeneral;
            let anticipoGlobalAplicado = (data['anticipoGlobal'] * pesoPorc) / 100;
            let anticipoGlobalUnitario = anticipoGlobalAplicado / item['cantidad'];
            /*jsonResult['dAntGloPreUniIt'] = parseFloat(anticipoGlobalUnitario + '').toFixed(8); //Analizar si no es mejor dejar config.decimals
                                                                                                //o si da error, se puede hacer de la misma forma como hacen los otros
            if (data.moneda === 'PYG') {
              jsonResult['dAntGloPreUniIt'] = parseFloat(jsonResult['dAntGloPreUniIt']).toFixed(config.pygDecimals);
            }*/
            if (data.moneda === 'PYG') {
                jsonResult['dAntGloPreUniIt'] = parseFloat(anticipoGlobalUnitario + '').toFixed(config.pygDecimals);
            }
            else {
                jsonResult['dAntGloPreUniIt'] = parseFloat(anticipoGlobalUnitario + '').toFixed(8);
            }
        }
        /* dTotOpeItem (EA008)
                Si D013 = 1, 3, 4 o 5 (afectado al IVA, Renta, ninguno, IVA - Renta),
                    entonces EA008 corresponde al cálculo aritmético:
                        (E721 (Precio unitario) –
                        EA002 (Descuento particular) –
                        EA004 (Descuento global) –
                        EA006 (Anticipo particular) –
                        EA007 (Anticipo global)) * E711(cantidad)
    
                Cálculo para Autofactura (C002=4): E721 * E711
            */
        if (data['tipoImpuesto'] == 1 ||
            data['tipoImpuesto'] == 3 ||
            data['tipoImpuesto'] == 4 ||
            data['tipoImpuesto'] == 5) {
            const precioUnitarioConDescuentoAplicado = parseFloat(item['precioUnitario']) -
                parseFloat(jsonResult['dDescItem'] || 0) -
                parseFloat(jsonResult['dDescGloItem'] || 0) -
                parseFloat(jsonResult['dAntPreUniIt'] || 0) -
                parseFloat(jsonResult['dAntGloPreUniIt'] || 0);
            jsonResult['dTotOpeItem'] = parseFloat(precioUnitarioConDescuentoAplicado + '') * parseFloat(item['cantidad']);
            if (config.sum0_000001SuffixBeforeToFixed == true) {
                jsonResult['dTotOpeItem'] += 0.000001;
            }
            if (jsonResult['dDescGloItem'] == 0) {
                // Cuando no hay descuento Global por item, entonces utiliza los redondeos establecidos en config, para el dTotOpeItem
                //jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.decimals));
                if (data.moneda === 'PYG') {
                    jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.pygDecimals));
                }
                else {
                    //Otras monedas
                    jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.decimals));
                }
            }
            else {
                // Cuando hay descuento Global por item, entonces utiliza el maximo permitido para que el calculo al final salga exacto.
                jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(8));
            }
        }
        if (data['tipoDocumento'] == 4) {
            //Si es Autofactura
            jsonResult['dTotOpeItem'] = parseFloat(item['precioUnitario']) * parseFloat(item['cantidad']);
            //jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.decimals));
            if (data.moneda === 'PYG') {
                jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.pygDecimals));
            }
            else {
                //Otras monedas
                jsonResult['dTotOpeItem'] = parseFloat(jsonResult['dTotOpeItem'].toFixed(config.decimals));
            }
        }
        if (data['condicionTipoCambio'] == 2) {
            jsonResult['dTotOpeGs'] = jsonResult['dTotOpeItem'] * item['cambio'];
        }
        return jsonResult;
    }
    /**
     * E8.2. Campos que describen el IVA de la operación por ítem (E730-E739)
     *
     * @param params
     * @param data
     * @param options
     * @param items Es el item actual del array de items de "data" que se está iterando
     */
    generateDatosItemsOperacionIVA(params, data, item, i, gCamItem, config) {
        let ivaProporcion = item['ivaBase'];
        if (typeof item.ivaProporcion != 'undefined') {
            ivaProporcion = item.ivaProporcion;
        }
        const jsonResult = {
            iAfecIVA: item['ivaTipo'],
            dDesAfecIVA: constants_service_1.default.codigosAfectaciones.filter((ca) => ca.codigo === +item['ivaTipo'])[0]['descripcion'],
            dPropIVA: ivaProporcion,
            dTasaIVA: item['iva'],
        };
        /*  Calculo para E735
            Si E731 = 1 o 4 este campo es igual al resultado del cálculo
                [EA008 * (E733/100)] / 1,1 si la tasa es del 10%
                [EA008 * (E733/100)] / 1,05 si la tasa es del 5%
            Si E731 = 2 o 3 este campo es igual 0
        */
        jsonResult['dBasGravIVA'] = 0; //Valor por defecto
        if (item['ivaTipo'] == 1 || item['ivaTipo'] == 4) {
            ////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Antes de NT13 -- esta opcion esta deprecada, valida solo hasta el 21/05/2023
            if (item['iva'] == 10) {
                jsonResult['dBasGravIVA'] =
                    (gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * (ivaProporcion / 100)) / 1.1;
            }
            if (item['iva'] == 5) {
                jsonResult['dBasGravIVA'] =
                    (gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * (ivaProporcion / 100)) / 1.05;
            }
            if (config.test == true) {
                // En ambiente de test desde 21/04/2023 hasta 21/05/2023
                // Aplicando NT13
                //-------------------------------------------------------------
                /**
                * Cambios en NT13
                  Si E731 = 1 o 4 este campo es igual al resultado del cálculo:
                    [100 * EA008 * E733] / [10000 + (E734 * E733)]
        
                  Si E731 = 2 o 3 este campo es igual 0
                */
                if (new Date().getTime() >= new Date('2023-04-21').getTime()) {
                    jsonResult['dBasGravIVA'] =
                        (100 * gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * ivaProporcion) /
                            (10000 + item['iva'] * ivaProporcion);
                }
            }
            //Vigencia en Test y Produccion
            if (new Date().getTime() >= new Date('2023-06-17').getTime()) {
                //Si la fecha de hoy ya supera el plazo de entrada en vigor ya no importa, utiliza la nueva forma.
                /**
                * Cambios en NT13
                  Si E731 = 1 o 4 este campo es igual al resultado del cálculo:
                    [100 * EA008 * E733] / [10000 + (E734 * E733)]
        
                  Si E731 = 2 o 3 este campo es igual 0
                */
                jsonResult['dBasGravIVA'] =
                    (100 * gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * ivaProporcion) /
                        (10000 + item['iva'] * ivaProporcion);
            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////
            //Redondeo inicial a 2 decimales
            if (jsonResult['dBasGravIVA']) {
                jsonResult['dBasGravIVA'] = parseFloat(jsonResult['dBasGravIVA'].toFixed(config.partialTaxDecimals)); //Calculo intermedio, usa max decimales de SIFEN.
            }
        }
        /*
          Calculo para E736
          Corresponde al cálculo aritmético:
          E735 * ( E734 / 100 )
          Si E731 = 2 o 3 este campo es igual 0
        */
        jsonResult['dLiqIVAItem'] = 0;
        if (item['ivaTipo'] == 1 || item['ivaTipo'] == 4) {
            jsonResult['dLiqIVAItem'] = (jsonResult['dBasGravIVA'] * item['iva']) / 100;
            //Redondeo
            jsonResult['dLiqIVAItem'] = parseFloat(jsonResult['dLiqIVAItem'].toFixed(config.partialTaxDecimals));
        }
        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (config.test == true) {
            //Ambiente de test de SIFEN
            if (new Date().getTime() >= new Date('2023-04-21').getTime()) {
                //Esta parte debe entrar en vigor en produccion a partir de 21/05/2023
                //Calculo para E737, aparecio en la NT13
                jsonResult['dBasExe'] = 0; //Valor por defecto E737
                if (item['ivaTipo'] == 4) {
                    //E731 == 4
                    // Aplicando NT13
                    //-------------------------------------------------------------
                    /**
                      Si E731 = 4 este campo es igual al resultado del cálculo:
                      [100 * EA008 * (100 – E733)] / [10000 + (E734 * E733)]
                      Si E731 = 1 , 2 o 3 este campo es igual 0
                    */
                    jsonResult['dBasExe'] =
                        (100 * gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * (100 - ivaProporcion)) /
                            (10000 + item['iva'] * ivaProporcion);
                    //Redondeo inicial a 2 decimales
                    if (jsonResult['dBasExe']) {
                        jsonResult['dBasExe'] = parseFloat(jsonResult['dBasExe'].toFixed(config.partialTaxDecimals)); //Calculo intermedio, usa max decimales de SIFEN.
                    }
                }
            }
        }
        //Vigencia en test y produccion
        if (new Date().getTime() >= new Date('2023-06-17').getTime()) {
            //No importando si es test o produccion, luego del plazo de entrada en vigor en produccion ya aplica igualmente.
            jsonResult['dBasExe'] = 0; //Valor por defecto E737
            if (item['ivaTipo'] == 4) {
                //E731 == 4
                // Aplicando NT13
                //-------------------------------------------------------------
                /**
                  Si E731 = 4 este campo es igual al resultado del cálculo:
                  [100 * EA008 * (100 – E733)] / [10000 + (E734 * E733)]
                  Si E731 = 1 , 2 o 3 este campo es igual 0
                */
                jsonResult['dBasExe'] =
                    (100 * gCamItem['gValorItem']['gValorRestaItem']['dTotOpeItem'] * (100 - ivaProporcion)) /
                        (10000 + item['iva'] * ivaProporcion);
                //Redondeo inicial a 2 decimales
                if (jsonResult['dBasExe']) {
                    jsonResult['dBasExe'] = parseFloat(jsonResult['dBasExe'].toFixed(config.partialTaxDecimals)); //Calculo intermedio, usa max decimales de SIFEN.
                }
            }
        }
        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        return jsonResult;
    }
    /**
     * E8.4. Grupo de rastreo de la mercadería (E750-E760)
     *
     * @param params
     * @param data
     * @param options
     * @param items Es el item actual del array de items de "data" que se está iterando
     */
    generateDatosItemsOperacionRastreoMercaderias(params, data, item, i) {
        const jsonResult = {};
        if (item['lote']) {
            jsonResult['dNumLote'] = item['lote'];
        }
        if (item['vencimiento']) {
            jsonResult['dVencMerc'] = item['vencimiento'];
        }
        if (item['numeroSerie']) {
            jsonResult['dNSerie'] = item['numeroSerie'];
        }
        if (item['numeroPedido']) {
            jsonResult['dNumPedi'] = item['numeroPedido'];
        }
        if (item['numeroSeguimiento']) {
            jsonResult['dNumSegui'] = item['numeroSeguimiento'];
        }
        if (item['importador'] && item['importador']['nombre']) {
            //nt009 se retira estos campo
            //jsonResult['dNomImp'] = item['importador']['nombre'].substring(0, 60);
            //jsonResult['dDirImp'] = item['importador']['direccion'].substring(0, 255);
            //jsonResult['dNumFir'] = item['importador']['registroImportador'].substring(0, 20);
            //nt009 se retira estos campo
        }
        if (item['registroSenave']) {
            jsonResult['dNumReg'] = item['registroSenave'];
        }
        if (item['registroEntidadComercial']) {
            jsonResult['dNumRegEntCom'] = item['registroEntidadComercial'];
        }
        if (item['nombreProducto']) {
            jsonResult['dNomPro'] = item['nombreProducto']; //E761
        }
        return jsonResult;
    }
    /**
     * E8.5. Sector de automotores nuevos y usados (E770-E789)
     *
     * @param params
     * @param data
     * @param options
     * @param items Es el item actual del array de items de "data" que se está iterando
     */
    generateDatosItemsOperacionSectorAutomotores(params, data, item, i) {
        if (!item['sectorAutomotor']) {
            //Como no indica que este campo es obligatorio, si no se informa sale con vacio
            return null;
        }
        /*if (
          constanteService.tiposOperacionesVehiculos.filter((um) => um.codigo === item['sectorAutomotor']['tipo']).length ==
          0
        ) {
          throw new Error(
            "Tipo de Operación de Venta de Automotor '" +
              item['sectorAutomotor']['tipo'] +
              "' en data.items[" +
              i +
              '].sectorAutomotor.tipo no encontrado. Valores: ' +
              constanteService.tiposOperacionesVehiculos.map((a) => a.codigo + '-' + a.descripcion),
          );
        }
        if (
          constanteService.tiposCombustibles.filter((um) => um.codigo === item['sectorAutomotor']['tipoCombustible'])
            .length == 0
        ) {
          throw new Error(
            "Tipo de Combustible '" +
              item['sectorAutomotor']['tipoCombustible'] +
              "' en data.items[" +
              i +
              '].sectorAutomotor.tipoCombustible no encontrado. Valores: ' +
              constanteService.tiposCombustibles.map((a) => a.codigo + '-' + a.descripcion),
          );
        }*/
        /*if (item['sectorAutomotor']['chasis']) {
          if (item['sectorAutomotor']['chasis'].length != 17) {
            throw new Error(
              "El Chasis '" + item['sectorAutomotor']['chasis'] + "' en data.items[" + i + '] debe tener 17 caracteres',
            );
          }
        }*/
        /*if (item['sectorAutomotor']['cilindradas']) {
          if ((item['sectorAutomotor']['cilindradas'] + '').length != 4) {
            throw new Error(
              "La Cilindradas '" +
                item['sectorAutomotor']['cilindradas'] +
                "' en data.items[" +
                i +
                '] debe tener 4 caracteres',
            );
          }
        }*/
        const jsonResult = {
            iTipOpVN: item['sectorAutomotor']['tipo'],
            dDesTipOpVN: constants_service_1.default.tiposOperacionesVehiculos.filter((ov) => ov.codigo === item['sectorAutomotor']['tipo'])[0]['descripcion'],
            dChasis: item['sectorAutomotor']['chasis'],
            dColor: item['sectorAutomotor']['color'],
            dPotencia: item['sectorAutomotor']['potencia'],
            dCapMot: item['sectorAutomotor']['capacidadMotor'],
            dPNet: item['sectorAutomotor']['pesoNeto'],
            dPBruto: item['sectorAutomotor']['pesoBruto'],
            iTipCom: item['sectorAutomotor']['tipoCombustible'],
            dDesTipCom: constants_service_1.default.tiposCombustibles.filter((tc) => tc.codigo === item['sectorAutomotor']['tipoCombustible'])[0]['descripcion'],
            dNroMotor: item['sectorAutomotor']['numeroMotor'],
            dCapTracc: item['sectorAutomotor']['capacidadTraccion'],
            dAnoFab: item['sectorAutomotor']['año'],
            cTipVeh: item['sectorAutomotor']['tipoVehiculo'],
            dCapac: item['sectorAutomotor']['capacidadPasajeros'],
        };
        if (item['sectorAutomotor']['cilindradas']) {
            jsonResult['dCilin'] = item['sectorAutomotor']['cilindradas'] + '';
        }
        //Se puede hacer todo por if, para no enviar null
        return jsonResult;
    }
}
exports.default = new JSonDteItemService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkR0ZUl0ZW0uc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXJ2aWNlcy9qc29uRHRlSXRlbS5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsOEVBQXFEO0FBQ3JELDRFQUFtRDtBQUduRCxNQUFNLGtCQUFrQjtJQUN0Qjs7Ozs7O09BTUc7SUFDSSwyQkFBMkIsQ0FBQyxNQUFXLEVBQUUsSUFBUyxFQUFFLE1BQW9CO1FBQzdFLE1BQU0sVUFBVSxHQUFRLEVBQUUsQ0FBQztRQUUzQixvREFBb0Q7UUFDcEQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDN0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFOUIsTUFBTSxRQUFRLEdBQVE7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDO2lCQUN4QixDQUFDO2dCQUVGLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7b0JBQzlCLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztpQkFDcEQ7Z0JBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDaEM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMs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