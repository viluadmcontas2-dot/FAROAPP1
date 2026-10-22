// Formulário de entrada da landing. Cada MÉTODO é uma entrada em METHODS: hoje só e-mail + senha.
// Ponto de extensão: para "e-mail + código de 6 dígitos" ou "Entrar pelo WhatsApp", acrescente outro método em METHODS
// ({ id, label, render }) e um botão de troca; o resto da landing (Landing) só recebe "entrou" por backend.onAuthChange.
import React from 'react';

const h = React.createElement;

// props do método: { t, mode, state, set, busy, submit, labels }
const passwordMethod = {
  id: 'senha',
  render: ({ t, mode, state, set, busy, submit, labels }) => {
    const field = { width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 16, border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.08)', color: '#fff', fontSize: 16, padding: '0 16px', fontFamily: 'inherit' };
    const lab = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700, opacity: 0.95 };
    return h('form', { onSubmit: submit, noValidate: true, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h('label', { style: lab }, 'E-mail', h('input', { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', value: state.email, onChange: set('email'), style: field })),
      h('label', { style: lab }, 'Senha', h('input', { type: 'password', autoComplete: mode === 'criar' ? 'new-password' : 'current-password', value: state.password, onChange: set('password'), style: field })),
      h('button', { type: 'submit', disabled: busy, style: labels.primary }, mode === 'criar' ? 'Criar conta e continuar' : 'Entrar e continuar'));
  },
};
export const METHODS = [passwordMethod];

export function AuthForm({ method = 'senha', ...props }) {
  const m = METHODS.find(x => x.id === method) || METHODS[0];
  return m.render(props);
}
