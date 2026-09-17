sap.ui.define(
  [
    "jquery.sap.global",
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
  ],
  function (
    jQuery,
    PluginViewController,
    JSONModel,
    MessageToast,
    MessageBox,
    Fragment,
  ) {
    "use strict";

    const ENDPOINTS = {
      RC_CATALOG: "/plant-ms/resourceReasonCodes",
    };

    // Bloque raíz "Maintenance (PM)" y sub-bloque "Reactive Maintenance (PM_030)" al que se filtra la selección
    const REASON_CODE_ROOT = "PM";
    const REASON_CODE_BLOCK = "PM_030";
    // Código maestro real del TimeElementBO para downtime no programado (ver zpluginGestionParos008: "UNSCHEDULED_DOWN" no existe, es "UNSCHEDULE_DOWN")
    const REASON_CODE_TIME_ELEMENT = "UNSCHEDULE_DOWN";

    return PluginViewController.extend(
      "serviacero.custom.plugins.zpluginaviso.controller.MainView",
      {
        onInit: function () {
          PluginViewController.prototype.onInit.apply(this, arguments);

          this._oSelectedAviso = null;
          this._aFullAvisoTree = [];
          this._aAllAvisoReasonCodes = [];
          this._oDialogSeleccionarAviso = null;
        },

        onAfterRendering: function () {
          this.getView()
            .byId("backButton")
            .setVisible(this.getConfiguration().backButtonVisible);
          this.getView()
            .byId("closeButton")
            .setVisible(this.getConfiguration().closeButtonVisible);

          this.getView()
            .byId("headerTitle")
            .setText(this.getConfiguration().title);
          this.getView()
            .byId("textPlugin")
            .setText(this.getConfiguration().text);
        },

        onBeforeRenderingPlugin: function () {},

        isSubscribingToNotifications: function () {
          var bNotificationsEnabled = true;

          return bNotificationsEnabled;
        },

        getCustomNotificationEvents: function (sTopic) {
          //return ["template"];
        },

        getNotificationMessageHandler: function (sTopic) {
          //if (sTopic === "template") {
          //    return this._handleNotificationMessage;
          //}
          return null;
        },

        _handleNotificationMessage: function (oMsg) {
          var sMessage = "Message not found in payload 'message' property";
          if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
            for (var i = 0; i < oMsg.parameters.length; i++) {
              switch (oMsg.parameters[i].name) {
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

        onValueHelpTitulo: function () {
          this._abrirDialogoAviso();
        },

        _abrirDialogoAviso: function () {
          var oView = this.getView();
          var oThis = this;

          if (this._oDialogSeleccionarAviso) {
            this._oDialogSeleccionarAviso.open();
            this._cargarReasonCodesAviso();
            return;
          }

          Fragment.load({
            name: "serviacero.custom.plugins.zpluginaviso.fragment.seleccionarAviso",
            controller: this,
          })
            .then(function (oLoadedDialog) {
              oThis._oDialogSeleccionarAviso = oLoadedDialog;
              oView.addDependent(oLoadedDialog);
              oLoadedDialog.open();
              oThis._cargarReasonCodesAviso();
            })
            .catch(function (oError) {
              console.error(
                "Error al cargar el fragmento de selección de aviso:",
                oError,
              );
              MessageBox.error(oThis._i18n("mensajeErrorCargarAviso"));
            });
        },

        onAfterCloseSeleccionAviso: function () {
          if (this._oDialogSeleccionarAviso) {
            this._oDialogSeleccionarAviso.destroy();
            this._oDialogSeleccionarAviso = null;
          }
        },

        _cargarReasonCodesAviso: function () {
          var plant = this.getPodController().getUserPlant();
          var oThis = this;
          var oDialog = this._oDialogSeleccionarAviso;

          var sUrl =
            this._buildBaseDmeUrl() +
            ENDPOINTS.RC_CATALOG +
            "?timeElement.ref=" +
            encodeURIComponent(
              "TimeElementBO:" + plant + "," + REASON_CODE_TIME_ELEMENT,
            ) +
            "&reasonCode1=" +
            encodeURIComponent(REASON_CODE_ROOT);

          if (oDialog) {
            oDialog.setBusy(true);
          }

          this.ajaxGetRequest(
            sUrl,
            null,
            function (oData) {
              if (oDialog) {
                oDialog.setBusy(false);
              }

              var aData = Array.isArray(oData)
                ? oData
                : oData && Array.isArray(oData.value)
                  ? oData.value
                  : [];
              var aTree = oThis._buildTreeFromResourceReasonCodes(aData);
              var aItems = oThis._extractBlockChildren(
                aTree,
                REASON_CODE_BLOCK,
              );

              oThis._aFullAvisoTree = aItems;
              oThis._aAllAvisoReasonCodes = oThis._flattenReasonCodes(
                aItems,
                [],
              );

              oThis
                .getView()
                .setModel(new JSONModel({ items: aItems }), "rcAvisoModel");
            },

            function (oError, sHttpErrorMessage) {
              if (oDialog) {
                oDialog.setBusy(false);
              }

              var sMsg =
                oError && oError.message
                  ? oError.message
                  : sHttpErrorMessage || oThis._i18n("mensajeErrorCargarAviso");
              MessageBox.error(sMsg);
            },
          );
        },

        _buildTreeFromResourceReasonCodes: function (aData) {
          var fnBuild = function (aNodes) {
            var aResult = [];

            (aNodes || []).forEach(function (oNode) {
              if (!oNode) return;

              var aChildren = oNode.resourceReasonCodeNodeCollection || [];

              if (oNode.description) {
                var aBuiltChildren = fnBuild(aChildren);
                var bIsLeaf = aBuiltChildren.length === 0;

                aResult.push({
                  keyId: oNode.keyId || "",
                  description: oNode.description,
                  reasonCode:
                    oNode.reasonCode4 ||
                    oNode.reasonCode3 ||
                    oNode.reasonCode2 ||
                    oNode.reasonCode1 ||
                    "",
                  selectable: bIsLeaf && !!oNode.keyId,
                  children: aBuiltChildren,
                });
              } else {
                var aInner = fnBuild(aChildren);
                aInner.forEach(function (oItem) {
                  aResult.push(oItem);
                });
              }
            });

            return aResult;
          };

          return fnBuild(aData);
        },

        _extractBlockChildren: function (aTree, sBlockCode) {
          var oBlockNode = null;

          var fnFind = function (aNodes) {
            (aNodes || []).some(function (oNode) {
              if (
                oNode.reasonCode === sBlockCode ||
                oNode.keyId === sBlockCode
              ) {
                oBlockNode = oNode;
                return true;
              }
              if (oNode.children && oNode.children.length) {
                fnFind(oNode.children);
              }
              return !!oBlockNode;
            });
          };

          fnFind(aTree);

          return oBlockNode ? oBlockNode.children || [] : [];
        },

        _flattenReasonCodes: function (aTree, aOut) {
          aOut = aOut || [];

          (aTree || []).forEach(function (oNode) {
            if (oNode.selectable) {
              aOut.push(oNode);
            }

            if (oNode.children && oNode.children.length) {
              this._flattenReasonCodes(oNode.children, aOut);
            }
          }, this);

          return aOut;
        },

        onSearchAviso: function (oEvent) {
          var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();

          if (!sQuery) {
            this.getView()
              .getModel("rcAvisoModel")
              .setProperty("/items", this._aFullAvisoTree);
            return;
          }

          var aFiltered = this._aAllAvisoReasonCodes.filter(function (oItem) {
            return (
              (oItem.description || "").toLowerCase().indexOf(sQuery) !== -1
            );
          });

          this.getView()
            .getModel("rcAvisoModel")
            .setProperty("/items", aFiltered);
        },

        onSelectAviso: function (oEvent) {
          var oItem =
            oEvent.getParameter("listItem") ||
            oEvent.getParameter("selectedItem");

          if (!oItem) return;

          var oCtx = oItem.getBindingContext("rcAvisoModel");
          var oNode = oCtx ? oCtx.getObject() : null;

          if (oNode && oNode.selectable) {
            this._oSelectedAviso = oNode;
          } else {
            this._oSelectedAviso = null;
            if (oItem.setSelected) {
              oItem.setSelected(false);
            }
          }
        },

        onConfirmSeleccionAviso: function () {
          if (!this._oSelectedAviso || !this._oSelectedAviso.keyId) {
            MessageBox.warning(this._i18n("mensajeSinAviso"));
            return;
          }

          var sOrden = this.getPodSelectionModel().getShopOrder() || "";
          var sDescripcion =
            this._oSelectedAviso.description ||
            this._oSelectedAviso.reasonCode ||
            "";
          var sTitulo = sOrden ? sOrden + " - " + sDescripcion : sDescripcion;

          if (sTitulo.length > 40) {
            sTitulo = sTitulo.substring(0, 40);
            MessageToast.show(this._i18n("mensajeTituloTruncado"));
          }

          var oInput = this.byId("inpTitulo");
          oInput.setValue(sTitulo);
          oInput.setValueState("None");

          this._oSelectedAviso = null;

          if (this._oDialogSeleccionarAviso) {
            this._oDialogSeleccionarAviso.close();
          }
        },

        onCancelSeleccionAviso: function () {
          this._oSelectedAviso = null;

          if (this._oDialogSeleccionarAviso) {
            this._oDialogSeleccionarAviso.close();
          }
        },

        _buildBaseDmeUrl: function () {
          return this.getPublicApiRestDataSourceUri()
            .replace("/fnd/api-gateway-ms/", "/dme")
            .replace(/^\.\.\//, "/");
        },

        _i18n: function (sKey, aArgs) {
          return this.getView()
            .getModel("i18n")
            .getResourceBundle()
            .getText(sKey, aArgs);
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
          const sWorkcenter =
            this.getPodSelectionModel().selectedPhaseWorkCenter;
          let url =
            this.getPublicApiRestDataSourceUri() +
            "/pe/api/v1/process/processDefinitions/start?key=REG_62836cd5-a067-43ed-9618-5fb67065ec08" +
            "&async=false";

          url = url;

          const oInput = this.byId("inpTitulo");
          const oCbPrioridad = this.byId("cbPrioridad"); // NUEVO
          const oTextArea = this.byId("txtDescripcion");

          const sTitulo = (oInput.getValue() || "").trim();
          const sPrioridadKey = oCbPrioridad.getSelectedKey(); // NUEVO (1/2/3)
          const sDesc = (oTextArea.getValue() || "").trim();

          const bTituloOk = this._setRequiredState(oInput, sTitulo.length > 0);
          const bPrioridadOk = this._setRequiredState(
            oCbPrioridad,
            !!sPrioridadKey,
          ); // NUEVO
          const bDescOk = this._setRequiredState(oTextArea, sDesc.length > 0);

          const bLenOk =
            this._setLengthState(oInput, sTitulo, 40) &
            this._setLengthState(oTextArea, sDesc, 200);

          if (!bTituloOk || !bPrioridadOk || !bDescOk || !bLenOk) {
            MessageBox.error(this._i18n("mensajeCamposObligatorios"));
            return;
          }

          const payload = {
            inPlant: planta,
            inClaseAviso: "Y1",
            inTitulo: sTitulo,
            inPrioridad: sPrioridadKey, // NUEVO: "1" | "2" | "3"
            inNotificationText: sDesc,
            inUser: "SAPDM_Manual",
            inWorkcenter: sWorkcenter,
            inAvisoManual: "AVISO_MANUAL",
            inClaseObjTec: "EAMS_EQUI",
          };

          let that = this;
          this.ajaxPostRequest(
            url,
            payload,
            function (oResponseData) {
              let oView = that.getView();

              console.log(oResponseData);

              let sMessage = that._i18n("mensajeAvisoGenerado", [
                oResponseData.outAVISO,
              ]);

              sap.m.MessageToast.show(sMessage);

              // Limpiar
              oInput.setValue("");
              oCbPrioridad.setSelectedKey("1"); // NUEVO

              let sTemplate = that._i18n("placeHolderPlano");
              oTextArea.setValue(sTemplate);

              oInput.setValueState("None");
              oCbPrioridad.setValueState("None"); // NUEVO
              oTextArea.setValueState("None");
            },
            function (oError, sHttpErrorMessage) {
              var err = oError || sHttpErrorMessage;
              MessageToast.show(err);
            },
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
            oControl.setValueStateText(
              this._i18n("mensajeMaximoCaracteres", [iMax]),
            );
          }
          return bOk;
        },
      },
    );
  },
);
