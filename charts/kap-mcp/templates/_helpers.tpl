{{/*
  Helpers kap-mcp — noms/labels via library-chart Onyxia.
*/}}

{{- define "kap-mcp.hostname" -}}
{{- .Values.ingress.hostname -}}
{{- end -}}

{{- define "kap-mcp.baseUrl" -}}
{{- $scheme := ternary "https" "http" .Values.ingress.tls -}}
{{- printf "%s://%s" $scheme (include "kap-mcp.hostname" .) -}}
{{- end -}}

{{- define "kap-mcp.mcpUrl" -}}
{{- printf "%s/mcp" (include "kap-mcp.baseUrl" .) -}}
{{- end -}}

{{- define "kap-mcp.secretName" -}}
{{- include "library-chart.fullname" . -}}
{{- end -}}

{{- define "kap-mcp.existingSecretData" -}}
{{- $existing := lookup "v1" "Secret" .Release.Namespace (include "library-chart.fullname" .) -}}
{{- if and $existing $existing.data -}}
{{- toJson $existing.data -}}
{{- else -}}
{{- "{}" -}}
{{- end -}}
{{- end -}}

{{/* Bearer stable : fourni, sinon Secret, sinon tirage. */}}
{{- define "kap-mcp.bearerToken" -}}
{{- if not (hasKey .Values "__bearerToken") -}}
{{- $existing := include "kap-mcp.existingSecretData" . | fromJson -}}
{{- $token := .Values.security.bearerToken -}}
{{- if not $token -}}
{{- $token = (index $existing "BEARER_TOKEN" | default "" | b64dec) | default (randAlphaNum 32) -}}
{{- end -}}
{{- $_ := set .Values "__bearerToken" $token -}}
{{- end -}}
{{- index .Values "__bearerToken" -}}
{{- end -}}
