import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import crypto from 'node:crypto';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'b', 'i',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
  'a', 'img',
  'blockquote', 'code', 'pre',
];

const ALLOWED_ATTR = {
  '*': ['class', 'id', 'style'],
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'th': ['scope', 'colspan', 'rowspan'],
  'td': ['colspan', 'rowspan'],
};

const ALLOWED_URI_REGEXP = /^(?:https?|mailto|tel):/i;

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

export function sanitizeHtmlStrict(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's'],
    ALLOWED_ATTR: {},
    KEEP_CONTENT: true,
  });
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

export function generateReportToken() {
  return crypto.randomBytes(32).toString('hex');
}