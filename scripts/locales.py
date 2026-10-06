# Fuente única de las traducciones. Genera public/_locales/*/messages.json.
# Uso: python3 scripts/locales.py
import json, os, re

M = {
 "extName": ("Tramita: plazos de notificaciones (ES/PT)", "Tramita: prazos de notificações (ES/PT)"),
 "extDescription": ("Calcula y te avisa de los plazos de tus notificaciones electrónicas (DEHú, AEAT, Portal das Finanças, ViaCTT). 100% local.",
                    "Calcula e avisa dos prazos das suas notificações eletrónicas (DEHú, AEAT, Portal das Finanças, ViaCTT). 100% local."),
 "addManual": ("+ Añadir", "+ Adicionar"),
 "fTitle": ("Asunto", "Assunto"),
 "fIssuer": ("Organismo", "Entidade"),
 "fRule": ("Tipo de notificación", "Tipo de notificação"),
 "fAvailable": ("Puesta a disposición", "Data de disponibilização"),
 "fAccessed": ("La abrí el (opcional)", "Abri em (opcional)"),
 "fResponse": ("Plazo para responder", "Prazo para responder"),
 "fAmount": ("Cantidad", "Quantidade"),
 "fUnit": ("Unidad", "Unidade"),
 "fNotes": ("Notas", "Notas"),
 "unitBusiness": ("días hábiles", "dias úteis"),
 "unitCalendar": ("días naturales", "dias seguidos"),
 "unitMonths": ("meses", "meses"),
 "presetNone": ("Solo vigilar la notificación", "Só vigiar a notificação"),
 "presetCustom": ("Otro (indica el plazo del documento)", "Outro (indique o prazo do documento)"),
 "presetEsReposicion": ("Recurso de reposición tributario (1 mes)", "Recurso de reposição tributário ES (1 mês)"),
 "presetEsAlegaciones10": ("Alegaciones / subsanación (10 días hábiles)", "Alegações ES (10 dias úteis)"),
 "presetPtReclamacaoGraciosa": ("Reclamación graciosa PT (120 días)", "Reclamação graciosa (120 dias)"),
 "presetPtAudicaoPrevia": ("Audiencia previa PT (15 días, comprueba el oficio)", "Audição prévia (15 dias, confirme no ofício)"),
 "ruleEsLey39": ("Notificación electrónica (10 días naturales, art. 43 Ley 39/2015)", "Notificação eletrónica ES (10 dias, art. 43 Lei 39/2015)"),
 "rulePtNotificacao": ("Notificación electrónica PT (día 15, art. 39 CPPT)", "Notificação eletrónica (15.º dia, art. 39.º CPPT)"),
 "rulePtCitacao": ("Citación electrónica PT (día 5, art. 39 CPPT)", "Citação eletrónica (5.º dia, art. 39.º CPPT)"),
 "holidayHint": ("Se tienen en cuenta solo los festivos nacionales. Si en tu comunidad o municipio hay otro festivo, el plazo real puede ser un día más largo: nunca más corto.",
                 "Só são considerados feriados nacionais. Feriados municipais podem tornar o prazo real um dia mais longo: nunca mais curto."),
 "save": ("Guardar", "Guardar"),
 "empty": ("No sigues ninguna notificación. Entra en tu buzón (DEHú, AEAT, Portal das Finanças, ViaCTT) y Tramita te propondrá las que encuentre, o añádelas a mano.",
           "Não está a seguir nenhuma notificação. Entre na sua caixa (Portal das Finanças, ViaCTT, DEHú, AEAT) e o Tramita propõe as que encontrar, ou adicione-as manualmente."),
 "availableOn": ("Puesta a disposición", "Disponibilizada em"),
 "notifiedOn": ("Se considera notificada", "Considera-se notificada"),
 "basisAccessed": ("la abriste", "abriu-a"),
 "basisPresumed": ("presunción legal", "presunção legal"),
 "keyResponse": ("Último día para responder", "Último dia para responder"),
 "keyNotified": ("Se da por notificada", "Considera-se notificada"),
 "stDone": ("Hecho", "Tratado"),
 "stOverdue": ("Vencido hace $N$ d", "Expirou há $N$ d", "N"),
 "stToday": ("¡Vence hoy!", "Termina hoje!"),
 "stDaysLeft": ("Quedan $N$ d", "Faltam $N$ d", "N"),
 "markDone": ("Marcar hecho", "Marcar tratado"),
 "reopen": ("Reabrir", "Reabrir"),
 "calendar": ("Calendario", "Calendário"),
 "delete": ("Borrar", "Apagar"),
 "confirmDelete": ("¿Borrar esta notificación de Tramita? (No afecta a la notificación oficial.)", "Apagar esta notificação do Tramita? (Não afeta a notificação oficial.)"),
 "source": ("Fuente", "Fonte"),
 "detected": ("detectada", "detetada"),
 "dismiss": ("Cerrar", "Fechar"),
 "foundN": ("$N$ posibles notificaciones en esta página", "$N$ possíveis notificações nesta página", "N"),
 "detectHint": ("Revisa la fecha: es la más antigua de cada fila. Desmarca lo que no sea una notificación.",
                "Confirme a data: é a mais antiga de cada linha. Desmarque o que não for uma notificação."),
 "addSelected": ("Seguir las marcadas", "Seguir as marcadas"),
 "addedN": ("Añadidas: $N$. Ábrelas en el icono de Tramita.", "Adicionadas: $N$. Veja-as no ícone do Tramita.", "N"),
 "notifOverdue": ("venció el $D$", "terminou a $D$", "D"),
 "notifToday": ("vence HOY", "termina HOJE"),
 "notifSoon": ("vence en $N$ días", "termina em $N$ dias", "N"),
 "errAccessedBefore": ("La fecha de apertura no puede ser anterior a la de puesta a disposición.", "A data de abertura não pode ser anterior à de disponibilização."),
 "errAmount": ("Indica un plazo válido (número entero mayor que 0).", "Indique um prazo válido (número inteiro maior que 0)."),
 "errSafTitle": ("Error SAF de AutoFirma", "Erro SAF do AutoFirma"),
 "errSafFix": ("Cierra el navegador, abre AutoFirma > Herramientas > Preferencias > General > Configuración de red y desactiva «Aceptar solo conexiones con sitios seguros». Alternativa: entra con Cl@ve Permanente.",
               "Feche o navegador, abra o AutoFirma > Ferramentas > Preferências > Geral > Configuração de rede e desative «Aceitar só ligações a sítios seguros». Alternativa: Cl@ve Permanente."),
 "errAutofirmaTitle": ("AutoFirma no responde", "O AutoFirma não responde"),
 "errAutofirmaFix": ("Comprueba que AutoFirma está instalado y actualizado (descárgalo solo de la web oficial), ciérralo del todo y vuelve a intentarlo. Si sigue fallando, reinstálalo con el navegador cerrado.",
                     "Confirme que o AutoFirma está instalado e atualizado (descarregue só do site oficial), feche-o e tente de novo. Se continuar, reinstale com o navegador fechado."),
 "errSessionTitle": ("Sesión caducada", "Sessão expirada"),
 "errSessionFix": ("Muchas sedes cierran la sesión tras unos 30 minutos. Cierra el navegador por completo (o usa una ventana de incógnito) y empieza el trámite de nuevo; ten los documentos preparados antes.",
                   "Muitas sedes fecham a sessão após ~30 minutos. Feche o navegador por completo (ou use uma janela anónima) e recomece; tenha os documentos preparados antes."),
 "errSessionFixPt": ("Vuelve a autenticarte. Si usas Chave Móvel Digital, ten el móvil a mano: el código caduca en pocos minutos.",
                     "Volte a autenticar-se. Se usa Chave Móvel Digital, tenha o telemóvel à mão: o código expira em poucos minutos."),
 "errPtPluginTitle": ("Falta el plugin Autenticação.gov", "Falta o plugin Autenticação.gov"),
 "errPtPluginFix": ("Para usar el Cartão de Cidadão con lector necesitas instalar el plugin oficial de autenticacao.gov.pt y reiniciar el navegador. Alternativa: Chave Móvel Digital o contraseña del portal.",
                    "Para usar o Cartão de Cidadão com leitor instale o plugin oficial em autenticacao.gov.pt e reinicie o navegador. Alternativa: Chave Móvel Digital ou senha do portal."),
 "disclaimer": ("Tramita no es una herramienta oficial ni asesoramiento jurídico. Los cálculos son orientativos: comprueba siempre los plazos en la propia notificación y en la sede.",
                "O Tramita não é uma ferramenta oficial nem aconselhamento jurídico. Os cálculos são indicativos: confirme sempre os prazos na própria notificação e no portal."),
 "privacy": ("Tus datos no salen de este navegador: sin servidores, sin analítica.", "Os seus dados não saem deste navegador: sem servidores, sem analítica."),
}

def entry(v, lang):
    msg = v[lang]
    out = {"message": msg}
    if len(v) == 3:
        name = v[2]
        out["placeholders"] = {name.lower(): {"content": "$1"}}
        out["message"] = msg.replace(f"${name}$", f"${name.lower()}$")
    return out

root = os.path.join(os.path.dirname(__file__), "..", "public", "_locales")
for lang, folder in ((0, "es"), (1, "pt_PT")):
    os.makedirs(os.path.join(root, folder), exist_ok=True)
    data = {k: entry(v, lang) for k, v in M.items()}
    with open(os.path.join(root, folder, "messages.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
print("ok", len(M))
