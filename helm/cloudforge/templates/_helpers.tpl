{{/*
Expand chart name.
*/}}
{{- define "cloudforge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "cloudforge.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloudforge.labels" -}}
helm.sh/chart: {{ include "cloudforge.name" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Image with optional global registry
*/}}
{{- define "cloudforge.image" -}}
{{- if .global.imageRegistry -}}
{{ .global.imageRegistry }}/{{ .repository }}:{{ .tag }}
{{- else -}}
{{ .repository }}:{{ .tag }}
{{- end -}}
{{- end }}
