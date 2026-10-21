// Entrada do app: só chama o boot com a configuração real. Sem eval/new Function (CSP script-src 'self').
import { createClient } from '@supabase/supabase-js';
import { boot } from './boot.js';
import { DEFAULT_CONFIG } from '../data/config.js';
import pkg from '../../package.json';

boot({ root: document.getElementById('root'), config: DEFAULT_CONFIG, createClient, version: String(pkg.version).split('-')[0] });
