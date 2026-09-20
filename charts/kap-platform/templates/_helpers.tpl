{{/*
  Helpers du chart kap-platform. Noms et labels viennent de la library-chart Onyxia.
*/}}

{{/* Hôte public du service. */}}
{{- define "kap-platform.hostname" -}}
{{- if .Values.ingress.enabled -}}
{{- .Values.ingress.hostname -}}
{{- else if .Values.route.enabled -}}
{{- .Values.route.hostname -}}
{{- end -}}
{{- end -}}

{{/* URL publique du service, terminée par « / ». */}}
{{- define "kap-platform.baseUrl" -}}
{{- $scheme := ternary "https" "http" (or .Values.route.enabled .Values.ingress.tls) -}}
{{- printf "%s://%s/" $scheme (include "kap-platform.hostname" .) -}}
{{- end -}}

{{/* Nom du Secret de la release. */}}
{{- define "kap-platform.secretName" -}}
{{- include "library-chart.fullname" . -}}
{{- end -}}

{{/* Plateforme port. */}}
{{- define "kap-platform.platformPort" -}}
{{- 3001 -}}
{{- end -}}

{{/* Caddy port. */}}
{{- define "kap-platform.caddyPort" -}}
{{- 8080 -}}
{{- end -}}

{{/* Nom du conteneur plateforme. */}}
{{- define "kap-platform.platformName" -}}
{{- printf "%s-%s" (include "library-chart.fullname" .) "platform" -}}
{{- end -}}

{{/* Nom du conteneur Caddy. */}}
{{- define "kap-platform.caddyName" -}}
{{- printf "%s-%s" (include "library-chart.fullname" .) "caddy" -}}
{{- end -}}