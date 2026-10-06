Faça uma revisão crítica do que foi feito até agora (ou de: $ARGUMENTS).

Verifique e relate, em ordem de gravidade:
1. **Segurança**: as regras do Firestore cobrem as mudanças? Algum dado de `users/` vaza na página pública? Alguma credencial no código?
2. **Correção**: cálculos de dinheiro usam `shared/`? Numeração sequencial em transação? Datas em pt-BR e fuso America/Sao_Paulo?
3. **Escopo**: algo foi construído que está em "Fora do MVP" no PRD?
4. **Mobile**: telas em 360px, áreas de toque ≥ 44px, `inputmode` corretos.
5. **Texto da interface**: segue o DESIGN.md (voz ativa, mesma ação com o mesmo nome)?

Rode typecheck, test e build. Liste os problemas com arquivo e linha e proponha correções, mas **não altere nada** até eu aprovar.
