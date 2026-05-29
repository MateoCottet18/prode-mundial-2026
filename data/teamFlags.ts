/**
 * Mapeo: nombre del equipo (como aparece en `data/matches.ts`, en español)
 * → código ISO 3166-1 alfa-2 (o gb-eng / gb-sct para Inglaterra y Escocia).
 *
 * Usado para mostrar banderitas pequeñas via flagcdn.com.
 * Si un nombre no está en el mapa, `getTeamFlagCode` devuelve null
 * y `CountryWithFlag` muestra solo el texto.
 */

const teamFlagCodes: Record<string, string> = {
  Alemania: "de",
  Argelia: "dz",
  "Arabia Saudita": "sa",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Bélgica: "be",
  "Bosnia y Herzegovina": "ba",
  Brasil: "br",
  "Cabo Verde": "cv",
  Canadá: "ca",
  Chequia: "cz",
  Colombia: "co",
  "Corea del Sur": "kr",
  "Costa de Marfil": "ci",
  Croacia: "hr",
  Curazao: "cw",
  Ecuador: "ec",
  Egipto: "eg",
  Escocia: "gb-sct",
  España: "es",
  "Estados Unidos": "us",
  Francia: "fr",
  Ghana: "gh",
  Haití: "ht",
  Inglaterra: "gb-eng",
  Irak: "iq",
  Irán: "ir",
  Japón: "jp",
  Jordania: "jo",
  Marruecos: "ma",
  México: "mx",
  Noruega: "no",
  "Nueva Zelanda": "nz",
  "Países Bajos": "nl",
  Panamá: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "RD Congo": "cd",
  Senegal: "sn",
  Sudáfrica: "za",
  Suecia: "se",
  Suiza: "ch",
  Turquía: "tr",
  Túnez: "tn",
  Uruguay: "uy",
  Uzbekistán: "uz",
};

export function getTeamFlagCode(teamName: string): string | null {
  if (!teamName) {
    return null;
  }
  return teamFlagCodes[teamName] ?? null;
}

/**
 * URL del PNG en flagcdn. Resoluciones soportadas: 20, 40, 80, 160, 320, 640.
 *
 * Para banderas inline pequeñas pedimos 40 (≈ 26x20 px reales). Para las
 * variantes "stack" donde la bandera es protagonista (cards de partido,
 * bracket, hero) pedimos 160 / 320 según el tamaño visual. La función ahora
 * acepta cualquiera de los valores oficiales y elige el más cercano hacia
 * arriba para que la bandera se vea nítida en pantallas retina.
 */
type FlagWidth = 20 | 40 | 80 | 160 | 320 | 640;

const SUPPORTED_FLAG_WIDTHS: FlagWidth[] = [20, 40, 80, 160, 320, 640];

function pickClosestWidth(target: number): FlagWidth {
  for (const width of SUPPORTED_FLAG_WIDTHS) {
    if (width >= target) return width;
  }
  return 640;
}

export function getTeamFlagUrl(teamName: string, requestedWidth: number = 40): string | null {
  const code = getTeamFlagCode(teamName);
  if (!code) {
    return null;
  }
  const width = pickClosestWidth(requestedWidth);
  return `https://flagcdn.com/w${width}/${code}.png`;
}
