sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel"
], function (jQuery, PluginViewController, JSONModel) {
	"use strict";

	return PluginViewController.extend("serviacero.custom.plugins.zpluginaviso.controller.MainView", {
		onInit: function () {
			PluginViewController.prototype.onInit.apply(this, arguments);
			
			           
            
		},




        onAfterRendering: function(){
           
            this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
            this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);
            
            this.getView().byId("headerTitle").setText(this.getConfiguration().title);
            this.getView().byId("textPlugin").setText(this.getConfiguration().text); 

        },

		onBeforeRenderingPlugin: function () {

			
			
		},

        isSubscribingToNotifications: function() {
            
            var bNotificationsEnabled = true;
           
            return bNotificationsEnabled;
        },


        getCustomNotificationEvents: function(sTopic) {
            //return ["template"];
        },


        getNotificationMessageHandler: function(sTopic) {

            //if (sTopic === "template") {
            //    return this._handleNotificationMessage;
            //}
            return null;
        },

        _handleNotificationMessage: function(oMsg) {
           
            var sMessage = "Message not found in payload 'message' property";
            if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
                for (var i = 0; i < oMsg.parameters.length; i++) {

                    switch (oMsg.parameters[i].name){
                        case "template":
                            
                            break;
                        case "template2":
                            
                        
                        }        
          

                    
                }
            }

        },
        

		onExit: function () {
			PluginViewController.prototype.onExit.apply(this, arguments);


		},



    onLiveChange: function (oEvent) {
      const oCtrl = oEvent.getSource();
      const sValue = (oCtrl.getValue() || "").trim();
      this._setRequiredState(oCtrl, sValue.length > 0);
    },

    onSelectionChange: function (oEvent) {
      const oCb = oEvent.getSource();
      const sKey = oCb.getSelectedKey();
      this._setRequiredState(oCb, !!sKey);
    },

    onEnviar: async function () {


      const planta = this.getPodController().getUserPlant();
      let url = this.getPublicApiRestDataSourceUri() + "/pe/api/v1/process/processDefinitions/start?key=REG_d8529216-3221-4680-8861-b40b66bfe1fa" + "&async=false";
            
      url = url; 

      const oInput = this.byId("inpTitulo");
      const oCbPrioridad = this.byId("cbPrioridad");      // NUEVO
      const oTextArea = this.byId("txtDescripcion");

      const sTitulo = (oInput.getValue() || "").trim();
      const sPrioridadKey = oCbPrioridad.getSelectedKey(); // NUEVO (1/2/3)
      const sDesc = (oTextArea.getValue() || "").trim();

      const bTituloOk = this._setRequiredState(oInput, sTitulo.length > 0);
      const bPrioridadOk = this._setRequiredState(oCbPrioridad, !!sPrioridadKey); // NUEVO
      const bDescOk = this._setRequiredState(oTextArea, sDesc.length > 0);

      const bLenOk =
        this._setLengthState(oInput, sTitulo, 40) &
        this._setLengthState(oTextArea, sDesc, 200);

      if (!bTituloOk || !bPrioridadOk || !bDescOk || !bLenOk) {
        MessageBox.error("Completa los campos obligatorios respetando los máximos.");
        return;
      }

      const payload = {
        inPlant : planta,
        inClaseAviso : "M2",
        inTitulo : sTitulo,
        inPrioridad : sPrioridadKey,     // NUEVO: "1" | "2" | "3"
        inNotificationText : sDesc,
        inUser : "SAPDM",
        inWorkCenter : this.getPodSelectionModel().selectedPhaseWorkCenter
      };

      let that = this;
            this.ajaxPostRequest(url, payload,
                function (oResponseData) {

                    let oView = that.getView(); 

                    console.log(oResponseData);

        let sMessage = "Se generó aviso de Avería SAP PM Nro. " + oResponseData.outAVISO
                    
        sap.m.MessageToast.show(sMessage);

        // Limpiar
        oInput.setValue("");
        oCbPrioridad.setSelectedKey("1"); // NUEVO

        let sTemplate = "Describa el problema:\n\n¿Cuándo empezó el problema?\n\n¿Qué hizo después de identificar el problema?\n\n"
        oTextArea.setValue(sTemplate);

        oInput.setValueState("None");
        oCbPrioridad.setValueState("None"); // NUEVO
        oTextArea.setValueState("None");

                },
                function (oError, sHttpErrorMessage) {
                    var err = oError || sHttpErrorMessage;
                    MessageToast.show(err);
                }
            );

    },

    _setRequiredState: function (oControl, bOk) {
      oControl.setValueState(bOk ? "None" : "Error");
      return bOk;
    },

    _setLengthState: function (oControl, sValue, iMax) {
      const bOk = sValue.length <= iMax;
      oControl.setValueState(bOk ? oControl.getValueState() : "Error");
      if (!bOk) {
        oControl.setValueStateText(`Máximo ${iMax} caracteres.`);
      }
      return bOk;
    }



	});
});