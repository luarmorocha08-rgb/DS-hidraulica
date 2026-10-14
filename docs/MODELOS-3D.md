# Experiência 3D — modelos e convenções

A intro da página inicial é uma cena React Three Fiber controlada pelo scroll
(`src/components/three/`). O roteiro (etapas, câmera, textos) fica em
`timeline.ts` e é compartilhado pela cena, pelos textos e pela sequência de
imagens.

## O que existe hoje

| Elemento | Situação |
| --- | --- |
| Caixa de direção | Modelo **paramétrico** (`gear/SteeringGear.tsx`) de caixa integral de esferas recirculantes: carcaça, tampa lateral com parafuso de ajuste, tampa traseira, eixo setor com setor dentado, pistão-cremalheira com guia de esferas, sem-fim com esferas, válvula rotativa com eixo de entrada, corpo da válvula com conexões de pressão/retorno, retentores e O-rings. |
| Desmontagem | Segue a ordem real: braço Pitman → retentor do setor → parafuso/tampa lateral/O-ring → eixo setor → tampa traseira/O-ring → pistão → corpo da válvula/retentor → válvula rotativa → sem-fim. A remontagem é o caminho inverso. |
| Caminhão | **Não há modelo profissional ainda.** Para não exibir um caminhão genérico mal construído, a cena começa no ambiente industrial com a caixa de direção. Com um GLB configurado, entram cabine basculante, faróis e escurecimento do veículo. |

> O modelo paramétrico é fiel à arquitetura do componente, mas não reproduz
> uma caixa específica (ex.: ZF 8098, TRW TAS). Para máximo realismo, use um
> GLB da caixa realmente atendida pela DS Hidráulica.

## Modelo do caminhão (`NEXT_PUBLIC_HERO_TRUCK_MODEL`)

Arquivo `.glb` (pode usar Draco ou Meshopt; decodificador Draco em `/public/draco/`).

- **Eixos:** Y para cima, frente do caminhão apontando para **+Z**. A escala é
  normalizada automaticamente (comprimento ≈ 9 unidades, rodas em y = 0).
- **Nós obrigatórios/opcionais:**

| Nome do nó | Uso |
| --- | --- |
| `Cab` | Cabine. A origem do nó deve estar **no eixo da articulação** da cabine; a animação gira em X até 52°. |
| `Headlight_L`, `Headlight_R` (ou qualquer nome contendo `headlight`) | Malhas dos faróis; recebem emissão que acende na apresentação. |
| `SteeringGearMount` | Objeto vazio na posição/orientação real da caixa de direção no chassi. A caixa sai daqui para a posição de destaque e volta na remontagem. |

- Materiais PBR (metalness/roughness). Recomendado: ≤ 150 mil triângulos,
  texturas 2K em KTX2/WebP, arquivo final ≤ 8 MB.

## Modelo da caixa de direção (`NEXT_PUBLIC_HERO_GEAR_MODEL`)

- Mesmos eixos do modelo paramétrico: **X = sem-fim/pistão**, **Z = eixo setor**,
  **Y = para cima**; carcaça com ~3 unidades de comprimento, centrada na origem.
- Cada peça como nó **filho direto da raiz**, com o nome `part_<id>`:
  `part_housing`, `part_pitman`, `part_sectorSeal`, `part_screw`,
  `part_sideCover`, `part_sideRing`, `part_sector`, `part_endCover`,
  `part_endRing`, `part_piston`, `part_valveHousing`, `part_inputSeal`,
  `part_valve`, `part_worm`.
- As direções e a ordem da desmontagem vêm de `GEAR_PARTS` em
  `gear/SteeringGear.tsx`; ajuste os vetores `dir` se a geometria real exigir.
- As etiquetas técnicas usam os pontos `anchor` do mesmo arquivo.

## Níveis de qualidade

`quality.ts` decide no navegador (pode forçar com `?3d=high|medium|low|static`):

- **high** — sombras suaves, piso com reflexo, partículas, DPR até 1,75.
- **medium** — sem sombras/reflexo, DPR até 1,25 (celulares e notebooks modestos).
- **low** — sem WebGL: sequência de imagens pré-renderizadas (`public/hero/sequence`).
- **static** — `prefers-reduced-motion` ou sem suporte: pôster + textos, sem scroll longo.

O `PerformanceMonitor` reduz a resolução se o FPS cair, e a renderização pausa
quando a seção sai da tela.

## Regenerar pôsteres e sequência

Depois de trocar modelos ou o roteiro:

```bash
npm run dev                     # terminal 1
CHROMIUM_PATH=/caminho/do/chrome npm run hero:render -- --frames 72   # terminal 2
```

Gera `public/hero/poster.jpg`, `poster-exploded.jpg` e `sequence/` (~1,5 MB).
A rota `/render/hero` usada na captura fica desativada em produção.
