// Specification (GRASP): "¿en qué tramo está una cuota?" es una pregunta
// distinta de "¿cuánto cuesta ese tramo?" (que responden las clases de
// política de mora, en este mismo directorio). Es el experto en
// información correcto: quien conoce los días de atraso es quien clasifica
// el tramo — nunca el tablero ni el caso de uso (sección 8.2, principio S).
//
// La implementación real vive en calculadora-mora.ts::clasificarTramoMora,
// que el Proyecto 2 exige dejar SIN CAMBIOS (es la prueba de que el motor
// no tuvo que tocarse para absorber la política escalonada). Este archivo
// solo la reexpone con el nombre de patrón, para que la intención de
// diseño quede explícita.
export { clasificarTramoMora as clasificarTramo, type TramoMora } from "../calculadora-mora.js";
