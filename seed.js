import { db } from "./db.js";

const seed = [
  {
    "name": "Casco integral HJC i11",
    "brand": "HJC",
    "category": "Protección",
    "kind": "accessory",
    "description": "Casco integral deportivo. La ficha del modelo i11 indica calota de Advanced Polycarbonate Compound, sistema de ventilación, visor HJ-38 preparado para Pinlock y almohadillas interiores desmontables. Confirmá talle, versión y homologación exigida para circular en Argentina antes de comprar.",
    "image": "https://hjchelmets.us/cdn/shop/files/semi_flat_black___i11_solid_1.png?v=1770335896&width=1000",
    "source_url": "https://hjchelmets.us/products/i11-solid",
    "specs": [
      "Tipo: casco integral",
      "Calota: Advanced Polycarbonate Compound",
      "Ventilación: 3 entradas y 5 extractores (ficha del modelo)",
      "Visor: HJ-38 preparado para Pinlock",
      "Interior: desmontable y lavable según versión",
      "Conectividad: preparado para SMART HJC; módulo se vende aparte",
      "Verificar talle, homologación local y disponibilidad de la versión"
    ]
  },
  {
    "name": "Baúl Kappa K45N – 45 litros",
    "brand": "Kappa",
    "category": "Equipaje",
    "kind": "accessory",
    "description": "Baúl trasero rígido Kappa Monolock de 45 litros, negro con inserciones laterales grises. Kappa informa que incluye la placa K628 y un kit de fijación universal. Verificá la compatibilidad del soporte y la carga máxima admitida por tu motocicleta.",
    "image": "https://media.kappamoto.com/AK-Prodotti/foto/K45N.jpg",
    "source_url": "https://www.kappamoto.com/cases/Monolock-System/K45N",
    "specs": [
      "Modelo: Kappa K45N",
      "Capacidad: 45 litros",
      "Sistema: Monolock",
      "Color: negro con inserciones laterales grises",
      "Incluye placa K628 y kit de fijación universal según Kappa",
      "Resistencia al agua probada por el fabricante bajo lluvia intensa",
      "Confirmar compatibilidad del soporte con la motocicleta"
    ]
  },
  {
    "name": "Guantes touring de protección",
    "brand": "Genérico",
    "category": "Protección",
    "kind": "accessory",
    "description": "Guantes de conducción para uso urbano y turismo. La imagen ilustra el tipo de producto; confirmá marca, material, talles y protecciones de la variante que se cotiza.",
    "image": "https://hansamfg.com/images/products/202502200921062122612.jpg",
    "specs": [
      "Uso: urbano / touring",
      "Talles y materiales: consultar disponibilidad",
      "Verificar nivel de protección y certificación del modelo"
    ]
  },
  {
    "name": "Soporte de celular para manillar",
    "brand": "Genérico",
    "category": "Accesorios",
    "kind": "accessory",
    "description": "Soporte de manillar regulable para teléfono. Antes de comprar, revisá dimensiones del dispositivo, diámetro del manillar y que el sistema de retención sea apropiado para el uso previsto.",
    "image": "https://magicjohn.com/cdn/shop/files/x22-motorcycle-phone-mount11.jpg?v=1783419184&width=1000",
    "specs": [
      "Montaje: manillar",
      "Compatibilidad: depende del teléfono y abrazadera",
      "Revisar medidas y fijación antes de comprar"
    ]
  },
  {
    "name": "Faros auxiliares LED",
    "brand": "Genérico",
    "category": "Iluminación",
    "kind": "accessory",
    "description": "Faros auxiliares LED para motocicleta. La instalación debe respetar voltaje, consumo eléctrico, orientación del haz y normativa de tránsito aplicable.",
    "image": "https://motofever.com/cdn/shop/files/L16.png?v=1749635351&width=1000",
    "specs": [
      "Tipo: iluminación LED auxiliar",
      "Consultar potencia, tensión y soportes incluidos",
      "Instalación recomendada por técnico"
    ]
  },
  {
    "name": "Cubrepuños para motocicleta",
    "brand": "BMW Motorrad / Genérico",
    "category": "Confort",
    "kind": "accessory",
    "description": "Protección de manos para reducir el viento y pequeñas proyecciones. La foto corresponde a un conjunto de cubrepuños; compatibilidad y anclajes varían según modelo de moto.",
    "image": "https://www.accessoires-bmw-motorrad.fr/30803-large_default/jeu-de-protege-mains-bmw-f750gs-k80-f850gsgsa-k81k82-f900xr-k84.jpg",
    "specs": [
      "Tipo: cubrepuños",
      "Montaje: manillar / puntos de anclaje",
      "Verificar compatibilidad específica"
    ]
  },
  {
    "name": "Cadena antirrobo con alarma",
    "brand": "Oxford",
    "category": "Seguridad",
    "kind": "accessory",
    "description": "Cadena de seguridad con alarma integrada en el modelo de referencia. Comprobá longitud, tipo de cierre y batería/funcionamiento de la alarma en el producto efectivamente entregado.",
    "image": "https://www.ghostbikes.com/cdn/shop/files/29838-Oxford-Boss-Alarm-Chain-Lock-Yellow-LK489-1000-2.jpg?v=1719925337&width=1000",
    "specs": [
      "Marca/modelo ilustrado: Oxford Boss Alarm Chain Lock",
      "Uso: seguridad antirrobo",
      "Verificar largo y contenido del paquete"
    ]
  },
  {
    "name": "Bolso impermeable para equipaje",
    "brand": "Acerbis",
    "category": "Equipaje",
    "kind": "accessory",
    "description": "Bolso impermeable de equipaje. Confirmá la capacidad exacta y el sistema de fijación de la unidad publicada, además de asegurar la carga correctamente antes de viajar.",
    "image": "https://www.sportsbikeshop.co.uk/product_images/acerbis_x-water_verticle_textile_bag.jpg",
    "specs": [
      "Marca ilustrada: Acerbis",
      "Tipo: bolso impermeable",
      "Capacidad / correas: verificar variante disponible",
      "Fijar la carga de forma segura antes de circular"
    ]
  },
  {
    "name": "Kit de herramientas compacto",
    "brand": "Genérico",
    "category": "Herramientas",
    "kind": "kit",
    "description": "Set de herramientas compacto para ajustes y tareas sencillas de mantenimiento. Confirmá el listado de piezas incluido y que las medidas sean compatibles con tu motocicleta.",
    "image": "https://garageworkshop.co.nz/cdn/shop/files/75388ab5-fb41-4958-9f79-02cd3033f93b.webp?v=1764194700&width=1000",
    "specs": [
      "Uso: mantenimiento básico",
      "Contenido: validar listado de la caja publicada",
      "No reemplaza herramientas específicas ni reparación profesional"
    ]
  },
  {
    "name": "Kit de reparación de pinchaduras",
    "brand": "Genérico",
    "category": "Reparación",
    "kind": "kit",
    "description": "Kit de reparación de emergencia para neumáticos compatibles. Verificá si corresponde a neumáticos tubeless; no todos los daños pueden repararse con un kit de mechas y debe respetarse la recomendación del fabricante del neumático.",
    "image": "https://www.kalyoncumotor.com/idea/bm/61/myassets/products/625/k4915-2_min.png?revision=1748616800",
    "specs": [
      "Uso: reparación de emergencia",
      "Compatibilidad: depende del tipo de neumático",
      "Seguir las instrucciones y límites de reparación del fabricante"
    ]
  },
  {
    "name": "Kit de limpieza y lubricación de cadena",
    "brand": "Muc-Off",
    "category": "Mantenimiento",
    "kind": "kit",
    "description": "Conjunto de productos para limpieza y mantenimiento de transmisión por cadena. Seguí las instrucciones de los envases y evitá contaminar discos y pastillas de freno.",
    "image": "https://muc-off.com/cdn/shop/files/MCCK.jpg?v=1709800459",
    "specs": [
      "Marca ilustrada: Muc-Off",
      "Uso: limpieza y lubricación de cadena",
      "Evitar aplicar lubricante sobre frenos o neumáticos"
    ]
  },
  {
    "name": "Botiquín compacto para viaje",
    "brand": "Oxford",
    "category": "Seguridad",
    "kind": "kit",
    "description": "Botiquín compacto para llevar en viajes. Revisá el contenido y las fechas de vencimiento al recibirlo. No reemplaza capacitación ni atención médica.",
    "image": "https://imageflow.rad.eu/1/7O8RyiP89WE6RLgcoFI0m75gzAyq4VHc05gz7nSqLHGo8/first-aid-kit-oxford.jpg",
    "specs": [
      "Tipo: primeros auxilios básicos",
      "Contenido: revisar al recibir",
      "Controlar vencimientos"
    ]
  },
  {
    "name": "Honda Wave 110S",
    "brand": "Honda",
    "category": "CUB / Urbana",
    "kind": "moto",
    "description": "CUB urbana de 110 cc. Honda Argentina informa motor de 4 tiempos refrigerado por aire, transmisión semiautomática de 4 velocidades, arranque eléctrico y a pedal y sistema CBS. Hay variantes con diferencias de freno delantero y llantas.",
    "image": "https://motos.honda.com.ar/assets/uploads/models_versions/68911efed7ef9.webp",
    "source_url": "https://motos.honda.com.ar/modelos/wave-110s",
    "reference_price": 3529700,
    "specs": [
      "Cilindrada: 109 cc",
      "Motor: 4 tiempos, refrigerado por aire",
      "Transmisión: semiautomática, 4 velocidades",
      "Arranque: eléctrico y a pedal",
      "Frenos: CBS; equipamiento puede cambiar por versión",
      "Último precio sugerido visible en Honda Argentina: $3.529.700 (vigencia publicada 01/10/2026 al 31/10/2026)",
      "Precio sugerido, no necesariamente precio final; no incluye flete, seguro ni patentamiento"
    ]
  },
  {
    "name": "Honda GLH 150",
    "brand": "Honda",
    "category": "Business / Urbana",
    "kind": "moto",
    "description": "Motocicleta urbana de orientación laboral. Honda publica motor de 149 cc con inyección electrónica, caja de 5 marchas, tanque de 12,7 litros y frenos con sistema CBS.",
    "image": "https://motos.honda.com.ar/assets/uploads/models_versions/6891212f9d7f3.webp",
    "source_url": "https://motos.honda.com.ar/modelos/glh-150",
    "reference_price": 4737600,
    "specs": [
      "Cilindrada: 149 cc",
      "Motor: monocilíndrico 4T OHC, refrigerado por aire",
      "Alimentación: inyección electrónica",
      "Transmisión: 5 velocidades",
      "Tanque: 12,7 litros",
      "Peso en orden de marcha: 129 kg",
      "Freno delantero: disco 240 mm; trasero tambor con CBS",
      "Último precio sugerido visible en Honda Argentina: $4.737.600 (vigencia publicada 01/10/2026 al 31/10/2026)",
      "No incluye flete, seguro ni patentamiento; confirmar versión"
    ]
  },
  {
    "name": "Honda XR150L",
    "brand": "Honda",
    "category": "On-Off / Doble propósito",
    "kind": "moto",
    "description": "Motocicleta doble propósito de 149 cc para uso urbano y caminos de tierra. La ficha de Honda Argentina indica carburador, caja de 5 velocidades y arranque eléctrico y a pedal. Especificaciones y equipamiento pueden variar por año.",
    "image": "https://motos.honda.com.ar/assets/uploads/models_versions/689121b3c4eed.webp",
    "source_url": "https://motos.honda.com.ar/modelos/xr150l",
    "reference_price": 6051500,
    "specs": [
      "Cilindrada: 149 cc",
      "Motor: 4 tiempos OHC, refrigerado por aire",
      "Alimentación: carburador",
      "Transmisión: 5 velocidades",
      "Arranque: eléctrico y a pedal",
      "Tanque: 12 litros",
      "Peso en orden de marcha: aproximadamente 130 kg según ficha publicada",
      "Último precio sugerido visible en Honda Argentina: $6.051.500 (vigencia publicada 01/10/2026 al 31/10/2026)",
      "No incluye flete, seguro ni patentamiento; confirmar versión"
    ]
  },
  {
    "name": "Bajaj Rouser NS200",
    "brand": "Bajaj",
    "category": "Street / Sport",
    "kind": "moto",
    "description": "Naked deportiva de 200 cc. Bajaj Argentina publica 23,5 HP, 18,3 Nm, refrigeración líquida, horquilla invertida y monoamortiguador Nitrox. La dotación puede cambiar entre años y variantes.",
    "image": "https://bajaj.com.ar/wp-content/uploads/2025/07/NS-200-Negro-perfil-1.png",
    "source_url": "https://bajaj.com.ar/nueva-rouser-ns200/",
    "specs": [
      "Cilindrada: 200 cc",
      "Motor: monocilíndrico 4T SOHC, 4 válvulas, triple bujía, refrigeración líquida",
      "Potencia máxima publicada: 23,5 HP a 9.500 rpm",
      "Torque máximo publicado: 18,3 Nm a 8.000 rpm",
      "Suspensión delantera: horquilla telescópica invertida",
      "Suspensión trasera: monoamortiguador Nitrox",
      "Capacidad de tanque: verificar ficha de la variante vigente",
      "Ficha oficial Bajaj Argentina; verificar equipamiento del año/modelo"
    ]
  },
  {
    "name": "Royal Enfield Hunter 350",
    "brand": "Royal Enfield",
    "category": "Roadster / Neo-retro",
    "kind": "moto",
    "description": "Roadster neo-retro con motor monocilíndrico de 349 cc. La ficha oficial de Royal Enfield informa 20,2 bhp, 27 Nm, caja de 5 velocidades y asiento a 790 mm. El equipamiento varía por versión.",
    "image": "https://www.royalenfield.com/content/dam/royal-enfield/hunter-350/studio-shots/dapper-white.png",
    "source_url": "https://www.royalenfield.com/ar/es/motorcycles/hunter-350/",
    "specs": [
      "Cilindrada: 349 cc",
      "Potencia máxima: 20,2 bhp a 6.100 rpm",
      "Torque máximo: 27 Nm a 4.000 rpm",
      "Alimentación: inyección electrónica",
      "Transmisión: 5 velocidades",
      "Altura de asiento: 790 mm",
      "ABS de doble canal según versión",
      "Confirmar la variante y equipamiento exactos"
    ]
  }
];

const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products
    (name, brand, category, kind, description, specs, image, source_url, reference_price, price, stock, active, featured)
    VALUES (@name,@brand,@category,@kind,@description,@specs,@image,@source_url,@reference_price,NULL,0,1,@featured)
  `);
  const tx = db.transaction(items => {
    for (const item of items) insert.run({
      ...item,
      specs: JSON.stringify(item.specs || []),
      reference_price: item.reference_price ?? null,
      featured: item.featured ?? 0
    });
  });
  tx(seed);
  console.log(`Catálogo inicial cargado: ${seed.length} productos. Precio final y stock se completan desde /admin.html.`);
}
