import type { ThemeRegistrationRaw } from 'shiki'

/**
 * Custom Shiki theme matching the FlareCMS homepage terminal palette.
 *
 * Key colors:
 *   Flare orange  #f6821f  — keywords, control flow
 *   Cyan          #22d3ee  — strings, imports
 *   Slate-200     #e2e8f0  — default text, variables
 *   Slate-400     #94a3b8  — comments, punctuation
 *   Emerald       #34d399  — booleans, constants
 *   Amber         #fbbf24  — types, annotations
 */
export const flareThemeDark: ThemeRegistrationRaw = {
  name: 'flare-dark',
  type: 'dark',
  colors: {
    'editor.background': '#0f172a',
    'editor.foreground': '#e2e8f0',
  },
  tokenColors: [
    // Comments
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#64748b', fontStyle: 'italic' },
    },
    // Strings
    {
      scope: ['string', 'string.quoted', 'string.template'],
      settings: { foreground: '#22d3ee' },
    },
    // Keywords & control flow
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator.new',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.control.import',
        'keyword.control.export',
        'keyword.control.from',
        'keyword.control.default',
      ],
      settings: { foreground: '#f6821f' },
    },
    // Functions
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#e2e8f0' },
    },
    // Types, classes, interfaces
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
        'entity.other.inherited-class',
      ],
      settings: { foreground: '#fbbf24' },
    },
    // Constants & booleans
    {
      scope: [
        'constant',
        'constant.language',
        'constant.language.boolean',
        'constant.numeric',
      ],
      settings: { foreground: '#34d399' },
    },
    // Variables & parameters
    {
      scope: ['variable', 'variable.parameter', 'variable.other'],
      settings: { foreground: '#e2e8f0' },
    },
    // Object properties
    {
      scope: [
        'variable.other.property',
        'variable.other.object.property',
        'meta.object-literal.key',
        'support.type.property-name',
      ],
      settings: { foreground: '#cbd5e1' },
    },
    // Operators
    {
      scope: ['keyword.operator', 'keyword.operator.assignment'],
      settings: { foreground: '#94a3b8' },
    },
    // Punctuation (braces, brackets, commas)
    {
      scope: [
        'punctuation',
        'meta.brace',
        'punctuation.definition.block',
        'punctuation.separator',
        'punctuation.terminator',
      ],
      settings: { foreground: '#64748b' },
    },
    // Tag names (HTML/JSX)
    {
      scope: ['entity.name.tag', 'support.class.component'],
      settings: { foreground: '#f6821f' },
    },
    // Tag attributes
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#fbbf24' },
    },
    // Regex
    {
      scope: ['string.regexp'],
      settings: { foreground: '#fb923c' },
    },
    // Markdown headings
    {
      scope: ['markup.heading', 'entity.name.section'],
      settings: { foreground: '#f6821f', fontStyle: 'bold' },
    },
    // Markdown bold/italic
    {
      scope: ['markup.bold'],
      settings: { fontStyle: 'bold' },
    },
    {
      scope: ['markup.italic'],
      settings: { fontStyle: 'italic' },
    },
    // Shell commands
    {
      scope: ['source.shell', 'source.bash'],
      settings: { foreground: '#e2e8f0' },
    },
    // JSON keys
    {
      scope: ['support.type.property-name.json'],
      settings: { foreground: '#cbd5e1' },
    },
    // TOML/YAML keys
    {
      scope: ['keyword.key', 'entity.name.tag.yaml'],
      settings: { foreground: '#cbd5e1' },
    },
    // CSS selectors
    {
      scope: ['entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'],
      settings: { foreground: '#fbbf24' },
    },
    // CSS properties
    {
      scope: ['support.type.property-name.css'],
      settings: { foreground: '#cbd5e1' },
    },
    // CSS values
    {
      scope: ['support.constant.property-value.css', 'constant.other.color.rgb-value.hex.css'],
      settings: { foreground: '#22d3ee' },
    },
  ],
}

export const flareThemeLight: ThemeRegistrationRaw = {
  name: 'flare-light',
  type: 'light',
  colors: {
    'editor.background': '#f8fafc',
    'editor.foreground': '#1e293b',
  },
  tokenColors: [
    // Comments
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#94a3b8', fontStyle: 'italic' },
    },
    // Strings
    {
      scope: ['string', 'string.quoted', 'string.template'],
      settings: { foreground: '#0891b2' },
    },
    // Keywords & control flow
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator.new',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.control.import',
        'keyword.control.export',
        'keyword.control.from',
        'keyword.control.default',
      ],
      settings: { foreground: '#c2410c' },
    },
    // Functions
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#1e293b' },
    },
    // Types, classes
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
      ],
      settings: { foreground: '#b45309' },
    },
    // Constants & booleans
    {
      scope: ['constant', 'constant.language', 'constant.numeric'],
      settings: { foreground: '#059669' },
    },
    // Variables
    {
      scope: ['variable', 'variable.parameter'],
      settings: { foreground: '#1e293b' },
    },
    // Object properties
    {
      scope: ['variable.other.property', 'meta.object-literal.key', 'support.type.property-name'],
      settings: { foreground: '#334155' },
    },
    // Operators
    {
      scope: ['keyword.operator'],
      settings: { foreground: '#64748b' },
    },
    // Punctuation
    {
      scope: ['punctuation', 'meta.brace'],
      settings: { foreground: '#94a3b8' },
    },
    // Tags
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#c2410c' },
    },
    // Attributes
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#b45309' },
    },
  ],
}
