/**
 * Helper de verificación para asociar extras con categorías de comida
 */

export const CATEGORIAS_CON_EXTRAS = [
  'Desayunos',
  'Comidas',
  'Antojitos',
  'Tortas',
  'Molletes',
];

/**
 * Determina si un extra aplica a una categoría específica
 * @param {Object} extraItem - Objeto del alimento tipo Extra
 * @param {string} categoria - Categoría objetivo ('Tortas', 'Molletes', 'Desayunos', 'Comida', 'Antojitos')
 * @returns {boolean}
 */
export const extraAplicaACategoria = (extraItem, categoria) => {
  if (!extraItem) return false;

  // Si no tiene asignada ninguna categoría (registros previos no editados), permitirlo por compatibilidad
  if (!extraItem.categorias_extra || typeof extraItem.categorias_extra !== 'string' || !extraItem.categorias_extra.trim()) {
    return true;
  }

  const catTarget = (categoria || '').toLowerCase().trim();
  const catsArray = extraItem.categorias_extra
    .toLowerCase()
    .split(',')
    .map((c) => c.trim());

  const aliases = {
    torta: ['torta', 'tortas'],
    tortas: ['torta', 'tortas'],
    mollete: ['mollete', 'molletes'],
    molletes: ['mollete', 'molletes'],
    comida: ['comida', 'comidas', 'platos fuertes'],
    comidas: ['comida', 'comidas', 'platos fuertes'],
    desayuno: ['desayuno', 'desayunos'],
    desayunos: ['desayuno', 'desayunos'],
    antojito: ['antojito', 'antojitos'],
    antojitos: ['antojito', 'antojitos'],
  };

  const targets = aliases[catTarget] || [catTarget];

  return catsArray.some((c) => targets.includes(c));
};
