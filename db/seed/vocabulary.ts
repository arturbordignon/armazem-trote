// Word lists the generator combines into ~10k plausible (and properly silly) products.
import type { ProductSpec } from '@/models/catalog.schema';

export interface OptionSet {
  name: string;
  values: readonly string[];
}

export interface ItemTemplate {
  name: string;
  description: string;
  material: string;
  /** Price range in whole reais. */
  price: readonly [min: number, max: number];
  /** Weight range in grams. */
  weight: readonly [min: number, max: number];
  options?: OptionSet;
  specs?: readonly ProductSpec[];
  isBulky?: boolean;
}

const SIZES: OptionSet = { name: 'Tamanho', values: ['P', 'M', 'G', 'GG'] };
const SHOE_SIZES: OptionSet = {
  name: 'Número',
  values: ['37', '38', '39', '40', '41', '42', '43', '44'],
};
const FINISHES: OptionSet = { name: 'Acabamento', values: ['Latão', 'Ferro negro', 'Cobre'] };
const LEATHERS: OptionSet = { name: 'Couro', values: ['Natural', 'Café', 'Negro'] };
const COLORS: OptionSet = { name: 'Cor', values: ['Vermelho', 'Azul', 'Verde', 'Xadrez'] };
const ROASTS: OptionSet = { name: 'Torra', values: ['Clara', 'Média', 'Escura'] };

// One template per line keeps this word list scannable.
// prettier-ignore
export const ITEMS_BY_SECTION: Readonly<Record<string, readonly ItemTemplate[]>> = {
  'cafe-e-mate': [
    { name: 'Saco de café 1 kg', description: 'Grãos colhidos no pano e secos no terreiro. Cheiro que acorda a casa inteira.', material: 'Café arábica', price: [35, 60], weight: [1000, 1000], options: ROASTS },
    { name: 'Pó de café torrado no tacho', description: 'Moído na hora em que o freguês pediu, nem um minuto antes.', material: 'Café arábica', price: [18, 32], weight: [500, 500], options: { name: 'Moagem', values: ['Grossa', 'Média', 'Fina'] } },
    { name: 'Erva-mate de barbaquá', description: 'Sapecada no fogo de chão, para chimarrão de roda comprida.', material: 'Erva-mate', price: [22, 38], weight: [1000, 1000], options: { name: 'Moagem', values: ['Grossa', 'Fina'] } },
    { name: 'Lata de chá-mate tostado', description: 'Para o mate gelado das tardes de janeiro.', material: 'Erva-mate tostada', price: [15, 25], weight: [250, 250] },
    { name: 'Café em grão para coador de pano', description: 'Torra lenta, para quem passa o café com calma e coador de flanela.', material: 'Café bourbon', price: [28, 45], weight: [500, 500], options: ROASTS },
    { name: 'Garrafa térmica de folha de flandres', description: 'Mantém o café quente da ordenha ao almoço.', material: 'Folha de flandres', price: [45, 80], weight: [700, 900] },
  ],
  'graos-e-farinhas': [
    { name: 'Saco de feijão carioquinha 5 kg', description: 'Catado grão a grão por quem tem paciência e boa vista.', material: 'Feijão carioca', price: [40, 65], weight: [5000, 5000] },
    { name: 'Fubá mimoso de moinho d’água', description: 'Moído devagar na pedra, ao som da roda e do riacho.', material: 'Milho', price: [8, 15], weight: [1000, 1000] },
    { name: 'Farinha de mandioca torrada', description: 'Crocante, amarelinha e pronta para a farofa de domingo.', material: 'Mandioca', price: [9, 16], weight: [1000, 1000], options: { name: 'Tipo', values: ['Fina', 'Biju'] } },
    { name: 'Arroz agulhinha do brejo', description: 'Solta no prato e não briga com o feijão.', material: 'Arroz', price: [25, 40], weight: [5000, 5000] },
    { name: 'Polvilho azedo de tacho', description: 'O segredo do pão de queijo que a vizinha não quer contar.', material: 'Fécula de mandioca', price: [12, 20], weight: [1000, 1000] },
    { name: 'Canjica branca de pilão', description: 'Socada no pilão, para a festa junina e para o frio de julho.', material: 'Milho branco', price: [9, 14], weight: [500, 500] },
  ],
  'doces-e-quitutes': [
    { name: 'Goiabada cascão em lata', description: 'Com pedaços de casca, como manda a tradição e a avó.', material: 'Goiaba e açúcar', price: [18, 30], weight: [700, 700] },
    { name: 'Doce de leite de panela', description: 'Mexido por três horas com colher de pau e muita conversa.', material: 'Leite e açúcar', price: [22, 36], weight: [600, 600] },
    { name: 'Queijo canastra', description: 'Curado na tábua de madeira, com casca fina e gosto de serra.', material: 'Leite cru', price: [60, 110], weight: [1000, 1200], options: { name: 'Cura', values: ['Fresco', 'Meia-cura', 'Curado'] } },
    { name: 'Paçoca de pilão', description: 'Amendoim torrado e socado até virar areia doce.', material: 'Amendoim e açúcar', price: [12, 20], weight: [400, 400] },
    { name: 'Pé de moleque de tabuleiro', description: 'Quebra-dente de primeira, para comer na porta da venda.', material: 'Amendoim e rapadura', price: [10, 18], weight: [300, 300] },
    { name: 'Biscoito de polvilho em saco de papel', description: 'Leve como a fofoca da quermesse, e some igual.', material: 'Polvilho', price: [9, 15], weight: [200, 200] },
  ],
  'banhas-e-conservas': [
    { name: 'Lata de banha caipira', description: 'De porco criado solto, para fritura que estala.', material: 'Banha de porco', price: [25, 40], weight: [2000, 2000] },
    { name: 'Vidro de pimenta curtida', description: 'Curtida na pinga por sete luas. Use com juízo.', material: 'Pimenta e cachaça', price: [14, 24], weight: [300, 300], options: { name: 'Ardência', values: ['Mansa', 'Braba', 'De chorar'] } },
    { name: 'Linguiça defumada no fumeiro', description: 'Pendurada sobre o fogão a lenha até pegar cor de cobre.', material: 'Carne suína', price: [30, 50], weight: [1000, 1000] },
    { name: 'Toucinho salgado', description: 'Para o feijão tropeiro e para o torresmo de sábado.', material: 'Toucinho', price: [20, 35], weight: [1000, 1000] },
    { name: 'Compota de figo em calda', description: 'Figos inteiros boiando em calda grossa e cravo.', material: 'Figo e açúcar', price: [20, 34], weight: [600, 600] },
    { name: 'Torresmo de rolo', description: 'Pururuca por fora, macio por dentro, culpa no dia seguinte.', material: 'Barriga suína', price: [25, 40], weight: [500, 500] },
  ],
  lampioes: [
    { name: 'Lampião de mesa', description: 'Luz amarelinha para ler o almanaque depois da janta.', material: 'Latão e vidro', price: [70, 140], weight: [1000, 1300], options: FINISHES },
    { name: 'Lampião de parede com refletor', description: 'O refletor espelhado dobra a luz e a vaidade do dono.', material: 'Latão e espelho', price: [90, 170], weight: [1200, 1600], options: FINISHES },
    { name: 'Lanterna de tropeiro', description: 'Aguenta vento, chuva e tropeção de mula.', material: 'Ferro e vidro', price: [60, 110], weight: [800, 1000], options: FINISHES },
    { name: 'Candeeiro de lata', description: 'Simples, barato e fiel como cachorro de sítio.', material: 'Folha de flandres', price: [25, 45], weight: [300, 500] },
    { name: 'Lampião de mina', description: 'Desce no buraco e volta, que é o que importa.', material: 'Ferro', price: [80, 150], weight: [1200, 1500] },
    { name: 'Lustre de querosene de seis bicos', description: 'Para o salão de baile e para impressionar o padre.', material: 'Latão fundido', price: [600, 1200], weight: [16_000, 22_000], isBulky: true },
  ],
  'velas-e-pavios': [
    { name: 'Maço de velas de cera de abelha', description: 'Queima devagar e cheira a mel.', material: 'Cera de abelha', price: [25, 45], weight: [600, 600], options: { name: 'Quantidade', values: ['6 unidades', '12 unidades'] } },
    { name: 'Rolo de pavio de algodão trançado', description: 'Para quem faz as próprias velas e não depende de ninguém.', material: 'Algodão', price: [8, 15], weight: [100, 100] },
    { name: 'Castiçal de estanho', description: 'Segura a vela firme mesmo em noite de trovoada.', material: 'Estanho', price: [35, 70], weight: [400, 600] },
    { name: 'Caixa de fósforos de segurança', description: 'Acende na primeira, salvo em dia de umidade.', material: 'Madeira e fósforo', price: [3, 6], weight: [50, 50], options: { name: 'Quantidade', values: ['1 caixa', '10 caixas'] } },
    { name: 'Vela de sebo para estrebaria', description: 'Não é cheirosa, mas o cavalo não reclama.', material: 'Sebo', price: [10, 18], weight: [400, 400] },
    { name: 'Apagador de velas de latão', description: 'Apaga sem soprar e sem espalhar fumaça na reza.', material: 'Latão', price: [20, 40], weight: [150, 150] },
  ],
  combustiveis: [
    { name: 'Querosene em lata (5 L)', description: 'Abastece o lampião por um mês de serões.', material: 'Querosene', price: [70, 110], weight: [4200, 4200] },
    { name: 'Óleo de mamona para candeeiro', description: 'Fumaça pouca e luz que dá para o gasto.', material: 'Óleo de mamona', price: [15, 28], weight: [900, 900] },
    { name: 'Carvão de lenha em saco', description: 'Para o ferro de passar e o churrasco do compadre.', material: 'Carvão vegetal', price: [25, 45], weight: [10_000, 10_000] },
    { name: 'Álcool de cana para fogareiro', description: 'Do mesmo alambique, mas não é para beber.', material: 'Álcool de cana', price: [12, 22], weight: [900, 900] },
    { name: 'Feixe de lenha seca', description: 'Rachada, seca e amarrada com cipó.', material: 'Eucalipto', price: [18, 30], weight: [12_000, 15_000] },
    { name: 'Kit do tropeiro: pavio e querosene', description: 'Tudo o que a lanterna precisa para atravessar a serra.', material: 'Algodão e querosene', price: [30, 50], weight: [1100, 1300] },
  ],
  chapeus: [
    { name: 'Chapéu de palha de carnaúba', description: 'Trançado à mão, fresco como sombra de mangueira.', material: 'Palha de carnaúba', price: [40, 80], weight: [150, 150], options: SIZES },
    { name: 'Chapéu de feltro de aba curta', description: 'Para a missa, o cartório e o baile da prefeitura.', material: 'Feltro de lã', price: [120, 200], weight: [180, 180], options: SIZES },
    { name: 'Chapéu de couro de vaqueiro', description: 'Aguenta espinho de mandacaru e chuva de pedra.', material: 'Couro curtido', price: [150, 260], weight: [350, 350], options: SIZES },
    { name: 'Boina de lã batida', description: 'Esquenta a cabeça e as ideias nas manhãs de geada.', material: 'Lã', price: [50, 90], weight: [120, 120], options: { name: 'Tamanho', values: ['P', 'M', 'G'] } },
    { name: 'Cartola de domingo', description: 'Acrescenta um palmo de altura e dois de respeito.', material: 'Feltro e seda', price: [180, 320], weight: [250, 250], options: SIZES },
    { name: 'Chapéu-coco', description: 'Elegante até para tirar leite.', material: 'Feltro rígido', price: [140, 240], weight: [200, 200], options: SIZES },
  ],
  calcados: [
    { name: 'Botina de elástico', description: 'Calça e descalça sem cadarço, no tempo de um cafezinho.', material: 'Couro de vaqueta', price: [180, 290], weight: [1300, 1500], options: SHOE_SIZES },
    { name: 'Alpargata de corda', description: 'Sola de corda trançada, fresquinha para a lida.', material: 'Lona e corda', price: [35, 60], weight: [400, 400], options: SHOE_SIZES },
    { name: 'Tamanco de madeira', description: 'Avisa a casa inteira de que você chegou.', material: 'Madeira e couro', price: [45, 80], weight: [900, 900], options: SHOE_SIZES },
    { name: 'Sapato de missa', description: 'Engraxado, lustroso e apertado na medida certa.', material: 'Couro envernizado', price: [150, 260], weight: [1000, 1000], options: SHOE_SIZES },
    { name: 'Perneira de couro cru', description: 'Protege a canela de cobra, espinho e cachorro bravo.', material: 'Couro cru', price: [90, 160], weight: [800, 800], options: { name: 'Tamanho', values: ['P', 'M', 'G'] } },
    { name: 'Chinelo de couro trançado', description: 'Para o alpendre, a rede e o fim de tarde.', material: 'Couro trançado', price: [40, 70], weight: [350, 350], options: SHOE_SIZES },
  ],
  'lencos-e-aviamentos': [
    { name: 'Lenço de seda para pescoço', description: 'Dá um ar de cavalheiro mesmo montado em burro.', material: 'Seda', price: [40, 70], weight: [50, 50], options: COLORS },
    { name: 'Suspensório de elástico', description: 'Segura a calça e a dignidade.', material: 'Elástico e couro', price: [35, 60], weight: [150, 150], options: { name: 'Cor', values: ['Preto', 'Marrom', 'Listrado'] } },
    { name: 'Carretel de linha forte', description: 'Costura botão, barra e rasgo de cerca de arame.', material: 'Algodão mercerizado', price: [6, 12], weight: [50, 50], options: { name: 'Cor', values: ['Branca', 'Preta', 'Crua'] } },
    { name: 'Caixa de botões de osso', description: 'Sortidos, para o paletó e a camisa de domingo.', material: 'Osso', price: [12, 22], weight: [100, 100] },
    { name: 'Cinto de couro com fivela de latão', description: 'Fivela que brilha de longe, em dia de sol.', material: 'Couro e latão', price: [60, 110], weight: [300, 300], options: SIZES },
    { name: 'Lenço de algodão estampado', description: 'Serve de guardanapo, de bandeira e de despedida.', material: 'Algodão', price: [20, 35], weight: [60, 60], options: COLORS },
  ],
  'roupas-de-lida': [
    { name: 'Camisa de algodão cru', description: 'Costurada para durar mais que a plantação de café.', material: 'Algodão cru', price: [70, 120], weight: [300, 300], options: SIZES },
    { name: 'Calça de brim reforçada', description: 'Joelho duplo para quem reza e para quem capina.', material: 'Brim', price: [90, 150], weight: [600, 600], options: SIZES },
    { name: 'Avental de couro de ferreiro', description: 'Faísca bate e volta. O ferreiro agradece.', material: 'Couro grosso', price: [80, 140], weight: [1200, 1200] },
    { name: 'Capa de chuva encerada', description: 'Água escorre, o cavaleiro segue seco e de bom humor.', material: 'Lona encerada', price: [160, 280], weight: [1500, 1500], options: SIZES },
    { name: 'Colete de lã', description: 'Tem bolso para o relógio e para o lenço.', material: 'Lã', price: [80, 140], weight: [400, 400], options: SIZES },
    { name: 'Poncho de lã crua', description: 'Cobre o cavaleiro, a sela e metade do cavalo.', material: 'Lã de ovelha', price: [180, 320], weight: [1500, 1500] },
  ],
  'selas-e-arreios': [
    { name: 'Sela de montaria', description: 'Assento fundo para viagem longa sem reclamar.', material: 'Couro curtido', price: [900, 1600], weight: [8000, 10_000], options: LEATHERS },
    { name: 'Cabeçada com rédeas', description: 'Costura dupla e argolas de latão polido.', material: 'Couro', price: [120, 220], weight: [800, 800], options: LEATHERS },
    { name: 'Manta de lã para sela', description: 'Protege o lombo do animal e dá um ar de festa.', material: 'Lã', price: [90, 160], weight: [1500, 1500], options: { name: 'Cor', values: ['Vermelha', 'Xadrez', 'Crua'] } },
    { name: 'Par de estribos de ferro', description: 'Firmes no pé, mesmo em galope de susto.', material: 'Ferro forjado', price: [80, 150], weight: [1600, 1600] },
    { name: 'Peitoral de couro trançado', description: 'Segura a sela no lugar nas subidas da serra.', material: 'Couro trançado', price: [140, 260], weight: [900, 900], options: LEATHERS },
    { name: 'Cangalha para burro de carga', description: 'Aguenta dois balaios e a paciência do burro.', material: 'Madeira e couro', price: [220, 380], weight: [6000, 8000] },
  ],
  'cordas-e-lacos': [
    { name: 'Laço de couro trançado', description: 'Oito tentos de couro cru, para laçar até boato.', material: 'Couro cru', price: [120, 220], weight: [1200, 1200], options: { name: 'Comprimento', values: ['10 m', '15 m'] } },
    { name: 'Corda de algodão', description: 'Macia na mão, firme na carga.', material: 'Algodão', price: [25, 45], weight: [1000, 1000], options: { name: 'Comprimento', values: ['10 m', '20 m', '30 m'] } },
    { name: 'Cabresto de corda', description: 'Leva o animal aonde ele, no fundo, já queria ir.', material: 'Sisal', price: [25, 45], weight: [400, 400] },
    { name: 'Rolo de barbante de sisal', description: 'Amarra embrulho, saco de milho e o dedo da memória.', material: 'Sisal', price: [10, 18], weight: [500, 500] },
    { name: 'Corda de cânhamo para carroça', description: 'Segura a carga até na estrada esburacada.', material: 'Cânhamo', price: [45, 80], weight: [3000, 3000], options: { name: 'Comprimento', values: ['20 m', '40 m'] } },
    { name: 'Peia de couro', description: 'Para o cavalo não ir passear sozinho à noite.', material: 'Couro', price: [30, 55], weight: [300, 300] },
  ],
  'trato-do-animal': [
    { name: 'Escova de crina', description: 'Deixa a crina do cavalo mais penteada que a do dono.', material: 'Cerdas e madeira', price: [25, 45], weight: [250, 250] },
    { name: 'Raspadeira de ferro', description: 'Tira a poeira da estrada e o barro do brejo.', material: 'Ferro', price: [20, 35], weight: [300, 300] },
    { name: 'Saco de milho para a tropa', description: 'Combustível oficial do burro e do cavalo.', material: 'Milho', price: [60, 95], weight: [20_000, 20_000] },
    { name: 'Bornal de lona', description: 'Pendura no focinho, e a refeição vai junto.', material: 'Lona', price: [30, 55], weight: [400, 400] },
    { name: 'Unguento para casco', description: 'Casco bem tratado não reclama de estrada de pedra.', material: 'Sebo e própolis', price: [18, 32], weight: [300, 300] },
    { name: 'Sino de pescoço para vaca', description: 'Para achar a Mimosa no meio do pasto.', material: 'Bronze', price: [35, 65], weight: [600, 600], options: { name: 'Tamanho', values: ['Pequeno', 'Médio', 'Grande'] } },
  ],
  'corte-e-lenha': [
    { name: 'Machado de lenhador', description: 'Cabo de jatobá e fio que dispensa conversa.', material: 'Aço e jatobá', price: [150, 260], weight: [2500, 2500] },
    { name: 'Foice roçadeira', description: 'Abre picada no mato e no assunto.', material: 'Aço temperado', price: [70, 120], weight: [1200, 1200] },
    { name: 'Facão de mato com bainha', description: 'Bainha de couro com costura de tropeiro.', material: 'Aço e couro', price: [90, 160], weight: [700, 700] },
    { name: 'Serrote de costas', description: 'Corte reto para encaixe que não range.', material: 'Aço e madeira', price: [70, 130], weight: [800, 800] },
    { name: 'Enxó de carpinteiro', description: 'Desbasta a tora até ela virar gamela.', material: 'Aço e madeira', price: [90, 150], weight: [1200, 1200] },
    { name: 'Traçador de duas mãos', description: 'Um puxa, o outro empurra, e os dois discutem.', material: 'Aço', price: [220, 380], weight: [3000, 3000] },
  ],
  oficina: [
    { name: 'Martelo de ferreiro', description: 'Bate no ferro quente e na mesa, na hora da conta.', material: 'Aço forjado', price: [70, 130], weight: [1500, 1500] },
    { name: 'Torquês de carpinteiro', description: 'Arranca prego teimoso e dente de leite.', material: 'Aço', price: [40, 75], weight: [500, 500] },
    { name: 'Plaina de madeira', description: 'Tira lasca fina como papel de seda.', material: 'Madeira e aço', price: [120, 210], weight: [1800, 1800] },
    { name: 'Jogo de formões', description: 'Seis larguras, cabos de madeira e estojo de lona.', material: 'Aço e madeira', price: [130, 240], weight: [1600, 1600] },
    { name: 'Lima murça', description: 'Afia a foice, a enxada e a língua do vizinho.', material: 'Aço', price: [25, 45], weight: [300, 300] },
    { name: 'Bigorna de bancada', description: 'Pesa mais que o ferreiro e dura mais que a ferraria.', material: 'Ferro fundido', price: [350, 650], weight: [22_000, 28_000], isBulky: true },
  ],
  maquinario: [
    { name: 'Moinho de café de manivela', description: 'Gira a manivela, e o cheiro chega antes do pó.', material: 'Ferro fundido e madeira', price: [180, 320], weight: [3000, 4000] },
    { name: 'Moedor de carne de ferro fundido', description: 'Prende na mesa e mói até linguiça de festa.', material: 'Ferro fundido', price: [160, 280], weight: [3500, 4500] },
    { name: 'Arado de aiveca', description: 'Vira a terra e o humor do boi.', material: 'Ferro e madeira', price: [900, 1600], weight: [40_000, 50_000], isBulky: true },
    { name: 'Debulhador de milho manual', description: 'Uma volta de manivela vale uma tarde de debulha.', material: 'Ferro fundido', price: [400, 750], weight: [18_000, 24_000], isBulky: true },
    { name: 'Prensa de queijo de madeira', description: 'Aperta a massa até o queijo pedir arrego.', material: 'Madeira de lei', price: [350, 600], weight: [15_000, 20_000], isBulky: true },
    { name: 'Roda de amolar com pedal', description: 'Afia faca, tesoura e machado sem precisar de tomada.', material: 'Pedra e ferro', price: [600, 1100], weight: [28_000, 34_000], isBulky: true },
  ],
  cozinha: [
    { name: 'Panela de ferro fundido', description: 'Passa de mãe para filha, junto com a receita.', material: 'Ferro fundido', price: [120, 220], weight: [3500, 5000], options: { name: 'Capacidade', values: ['2 L', '4 L', '6 L'] } },
    { name: 'Caneca de ágata', description: 'Para o café da manhã e o caldo de cana.', material: 'Ferro esmaltado', price: [18, 32], weight: [250, 250], options: { name: 'Cor', values: ['Azul', 'Vermelha', 'Branca', 'Verde'] } },
    { name: 'Coador de pano com suporte', description: 'O suporte é de arame; o segredo é do pano.', material: 'Flanela e arame', price: [20, 38], weight: [300, 300] },
    { name: 'Gamela de madeira', description: 'Para sovar o pão e servir o tutu.', material: 'Cedro', price: [45, 85], weight: [1200, 1200] },
    { name: 'Pilão de madeira', description: 'Soca alho, paçoca e as mágoas da semana.', material: 'Aroeira', price: [80, 150], weight: [4500, 5500] },
    { name: 'Chaleira de cobre', description: 'Apita quando ferve e brilha quando areada.', material: 'Cobre', price: [140, 260], weight: [1100, 1100] },
  ],
  fogoes: [
    { name: 'Fogão a lenha de duas bocas', description: 'Pequeno no tamanho, grande no feijão.', material: 'Ferro e tijolo', price: [1200, 1900], weight: [60_000, 80_000], isBulky: true },
    { name: 'Fogareiro de ferro', description: 'Leva para a pescaria e para o acampamento da tropa.', material: 'Ferro', price: [150, 280], weight: [5000, 7000] },
    { name: 'Forno de barro portátil', description: 'Assa pão, broa e leitão de Natal.', material: 'Barro cozido', price: [500, 900], weight: [35_000, 45_000], isBulky: true },
    { name: 'Chapa de ferro para fogão', description: 'Esquenta rápido e segura o calor da brasa.', material: 'Ferro fundido', price: [90, 160], weight: [5000, 7000] },
    { name: 'Grelha de fogão a lenha', description: 'Para o milho assado e a linguiça de sábado.', material: 'Ferro', price: [60, 110], weight: [2500, 3500] },
    { name: 'Fogão de ferro esmaltado de seis bocas', description: 'Cozinha para a família, os vizinhos e o padre.', material: 'Ferro esmaltado', price: [3200, 4800], weight: [140_000, 180_000], isBulky: true },
  ],
  tanoaria: [
    { name: 'Barrica de amburana', description: 'Dá à pinga um perfume de baunilha e saudade.', material: 'Amburana', price: [450, 850], weight: [15_000, 25_000], isBulky: true, options: { name: 'Capacidade', values: ['20 L', '50 L'] } },
    { name: 'Tina de banho de madeira', description: 'Para o banho de sábado, com água esquentada no fogão.', material: 'Cedro e ferro', price: [600, 1100], weight: [30_000, 40_000], isBulky: true },
    { name: 'Balde de madeira com aros', description: 'Tira água do poço sem deixar gosto de lata.', material: 'Pinho e ferro', price: [60, 110], weight: [2000, 3000] },
    { name: 'Pipa de pinga de jequitibá', description: 'Guarda a cachaça até ela ficar sábia.', material: 'Jequitibá', price: [900, 1600], weight: [40_000, 50_000], isBulky: true, options: { name: 'Capacidade', values: ['100 L', '200 L'] } },
    { name: 'Gamela de lavar roupa', description: 'Larga, funda e à prova de anil.', material: 'Peroba', price: [90, 170], weight: [5000, 7000] },
    { name: 'Corote de vinho', description: 'Pequeno barril para a mesa da festa.', material: 'Carvalho', price: [70, 130], weight: [2500, 3500], options: { name: 'Capacidade', values: ['5 L', '10 L'] } },
  ],
  asseio: [
    { name: 'Bacia e jarro de louça', description: 'Para lavar o rosto ao raiar do dia, com dignidade.', material: 'Louça', price: [120, 220], weight: [3000, 4000], options: { name: 'Cor', values: ['Branca', 'Florida'] } },
    { name: 'Navalha de barbear', description: 'Corta o bigode e a conversa fiada.', material: 'Aço e chifre', price: [60, 110], weight: [150, 150] },
    { name: 'Pincel de barba de cerdas', description: 'Faz espuma até em sabão de cinzas.', material: 'Cerdas e madeira', price: [30, 55], weight: [100, 100] },
    { name: 'Barra de sabão de coco', description: 'Lava roupa branca e consciência pesada.', material: 'Óleo de coco', price: [6, 12], weight: [300, 300] },
    { name: 'Pente de chifre', description: 'Desembaraça o cabelo e a crina, nessa ordem.', material: 'Chifre', price: [15, 28], weight: [50, 50] },
    { name: 'Escovão de piaçava', description: 'Esfrega o chão até o assoalho brilhar.', material: 'Piaçava e madeira', price: [20, 38], weight: [600, 600] },
  ],
  amuletos: [
    { name: 'Figa de guiné', description: 'Contra mau-olhado, inveja e cobrador.', material: 'Madeira de guiné', price: [12, 25], weight: [30, 30] },
    { name: 'Patuá de couro', description: 'O que vai dentro, só a benzedeira sabe.', material: 'Couro', price: [15, 30], weight: [40, 40] },
    { name: 'Ferradura dourada', description: 'Para quem quer a sorte com um pouco mais de brilho.', material: 'Ferro dourado', price: [35, 60], weight: [500, 500] },
    { name: 'Trevo de quatro folhas emoldurado', description: 'Achado no pasto depois de três semanas de procura.', material: 'Madeira e vidro', price: [40, 80], weight: [300, 300] },
    { name: 'Galho de arruda em vaso', description: 'Atrás da orelha ou na porta, funciona igual.', material: 'Barro e arruda', price: [15, 30], weight: [800, 800] },
    { name: 'Pé de coelho de pano', description: 'Nenhum coelho foi incomodado na fabricação.', material: 'Pano e algodão', price: [10, 20], weight: [30, 30] },
  ],
  'instrumentos-oticos': [
    { name: 'Binóculo de campanha', description: 'Vê o boi fugindo antes de ele chegar na cerca.', material: 'Latão e couro', price: [260, 480], weight: [900, 900] },
    { name: 'Lupa de leitura com cabo de osso', description: 'Para ler a letra miúda da escritura.', material: 'Vidro e osso', price: [40, 80], weight: [200, 200] },
    { name: 'Monóculo de cristal', description: 'Aumenta a vista e a pose.', material: 'Cristal e prata', price: [80, 150], weight: [30, 30] },
    { name: 'Óculos de aro de arame', description: 'Para enxergar de perto o preço e de longe o cobrador.', material: 'Arame e vidro', price: [60, 120], weight: [40, 40], options: { name: 'Grau', values: ['+1,0', '+2,0', '+3,0'] } },
    { name: 'Estereoscópio com cartões', description: 'Mostra Paris em relevo, sem sair da varanda.', material: 'Madeira e vidro', price: [180, 320], weight: [1200, 1200] },
    { name: 'Telescópio de tripé', description: 'Para contar as estrelas e vigiar a estrada.', material: 'Latão e madeira', price: [900, 1600], weight: [10_000, 14_000] },
  ],
  'aparelhos-misteriosos': [
    { name: 'Gramofone de corneta', description: 'Toca valsa, modinha e, às vezes, coisas que ninguém gravou.', material: 'Madeira e latão', price: [700, 1300], weight: [10_000, 14_000] },
    { name: 'Telégrafo de bancada', description: 'Ponto, traço, ponto. O resto é imaginação.', material: 'Latão e madeira', price: [400, 750], weight: [3000, 3000] },
    { name: 'Caixinha de música', description: 'Toca a mesma valsa desde o Império.', material: 'Madeira e latão', price: [90, 170], weight: [400, 400] },
    { name: 'Bússola que aponta para casa', description: 'O norte é relativo; a saudade, não.', material: 'Latão e vidro', price: [60, 120], weight: [150, 150] },
    { name: 'Relógio cuco que só canta no domingo', description: 'Nos outros dias, prefere ficar quieto.', material: 'Madeira entalhada', price: [250, 450], weight: [2500, 2500] },
    { name: 'Máquina fotográfica de fole', description: 'Fique paradinho por meio minuto e sorria por dentro.', material: 'Madeira e couro', price: [900, 1700], weight: [3500, 4500] },
  ],
};

export interface Maker {
  /** Appended to the item name: "Lampião de mesa de Ouro Fino". */
  suffix: string;
  place: string;
  blurb: string;
}

export const MAKERS: readonly Maker[] = [
  {
    suffix: 'de Ouro Fino',
    place: 'Ouro Fino, MG',
    blurb: 'Feito a três passos do armazém, sob o olhar do gerente.',
  },
  {
    suffix: 'de Pouso Alegre',
    place: 'Pouso Alegre, MG',
    blurb: 'Vem de Pouso Alegre, onde a tropa pernoita.',
  },
  {
    suffix: 'de Três Corações',
    place: 'Três Corações, MG',
    blurb: 'Feito em Três Corações, com capricho em dobro.',
  },
  {
    suffix: 'da Mantiqueira',
    place: 'Serra da Mantiqueira',
    blurb: 'Desceu a serra no lombo de mula, sem um arranhão.',
  },
  {
    suffix: 'do Seu Lauro',
    place: 'Sítio do Seu Lauro',
    blurb: 'Seu Lauro faz poucos por mês, e não aceita encomenda com pressa.',
  },
  {
    suffix: 'da Dona Benedita',
    place: 'Ouro Preto, MG',
    blurb: 'Dona Benedita garante a qualidade e manda lembranças.',
  },
  {
    suffix: 'do Engenho Boa Vista',
    place: 'Engenho Boa Vista',
    blurb: 'Saído do Engenho Boa Vista, ao som da moenda.',
  },
  {
    suffix: 'da Fazenda Santa Clara',
    place: 'Fazenda Santa Clara',
    blurb: 'Produção da Fazenda Santa Clara, desde o tempo do avô.',
  },
  {
    suffix: 'do Mestre Zé do Ferro',
    place: 'Campanha, MG',
    blurb: 'Mestre Zé do Ferro assina com a marca do martelo.',
  },
  {
    suffix: 'da Casa Bragança',
    place: 'Rio de Janeiro, RJ',
    blurb: 'Importado da Corte pela Casa Bragança.',
  },
  {
    suffix: 'de Campanha',
    place: 'Campanha, MG',
    blurb: 'De Campanha, terra de gente caprichosa.',
  },
  { suffix: 'de Itajubá', place: 'Itajubá, MG', blurb: 'Chegou de Itajubá pelo trem das seis.' },
  {
    suffix: 'do Vale do Sapucaí',
    place: 'Vale do Sapucaí, MG',
    blurb: 'Do Vale do Sapucaí, onde o rio faz curva para olhar.',
  },
  {
    suffix: 'da Tropa do Bento',
    place: 'Estrada Real',
    blurb: 'Trazido pela tropa do Bento, que nunca atrasa (muito).',
  },
  {
    suffix: 'de Diamantina',
    place: 'Diamantina, MG',
    blurb: 'De Diamantina, onde até as pedras são finas.',
  },
  {
    suffix: 'de São João del-Rei',
    place: 'São João del-Rei, MG',
    blurb: 'Feito em São João del-Rei, ao toque dos sinos.',
  },
  {
    suffix: 'do Porto de Santos',
    place: 'Santos, SP',
    blurb: 'Desembarcado no Porto de Santos e conferido pelo fiscal.',
  },
  {
    suffix: 'de Pelotas',
    place: 'Pelotas, RS',
    blurb: 'Veio de Pelotas, recomendado pela Sinhá Mariquinha.',
  },
  { suffix: 'de Itu', place: 'Itu, SP', blurb: 'De Itu, onde tudo é maior — menos o preço.' },
  { suffix: 'de Paraty', place: 'Paraty, RJ', blurb: 'Subiu de Paraty pelo caminho do ouro.' },
];

/** Optional model/series marker appended after the maker. Empty = no marker. */
export const EDITIONS: readonly string[] = [
  '',
  'Nº 2',
  'Nº 7',
  'Nº 12',
  'Modelo 1889',
  'Modelo 1893',
  'Tipo Exportação',
  'Reserva do Coronel',
];

export const QUIPS: readonly string[] = [
  'O cocheiro jura que é o melhor da região.',
  'Aprovado pelo burro, que é exigente.',
  'Chegou no vapor da semana passada.',
  'Garantia no fio do bigode.',
  'Não acompanha manual: o caixeiro explica de boca.',
  'Vendido também fiado, até o fim da colheita.',
  'Resiste a chuva, poeira e conversa comprida.',
  'A vizinha já tem um, e não para de falar nisso.',
  'Embalado em palha e esperança.',
  'Testado em três estradas e uma ponte bamba.',
  'Recomendado pelo padre, pelo delegado e pela sogra.',
  'Peça antes que o tropeiro leve tudo.',
  'Satisfação garantida, ou o burro volta para buscar.',
  'Usado na Corte, dizem. Ninguém confirma.',
  'Dura mais que promessa de candidato.',
  'O gerente usa um igual, mas não admite.',
];

export const BADGES: readonly string[] = [
  'Mais vendido',
  'Dá sorte',
  'Feito à mão',
  'Edição limitada',
  'Escolha do caixeiro',
  'Chegou do futuro',
];

export const REVIEW_AUTHORS: readonly string[] = [
  'Dona Benedita',
  'Seu Juvenal',
  'Sinhá Mariquinha',
  'Coronel Tibúrcio',
  'Padre Anselmo',
  'Mestre Zé do Ferro',
  'Nhá Chica',
  'Comadre Florinda',
  'Tenente Ambrósio',
  'Professora Iracema',
  'Doutor Epaminondas',
  'Tropeiro Bento',
  'Dona Zulmira',
  'Seu Quinzinho',
  'Viúva Porcina',
  'Major Felisberto',
];

export const REVIEW_PLACES: readonly string[] = [
  'Ouro Preto, MG',
  'Campanha, MG',
  'Pelotas, RS',
  'Itu, SP',
  'Diamantina, MG',
  'Paraty, RJ',
  'Goiás Velho, GO',
  'Cachoeira, BA',
  'Olinda, PE',
  'São João del-Rei, MG',
  'Tiradentes, MG',
  'Lapa, PR',
  'Pirenópolis, GO',
  'Sabará, MG',
];

export interface ReviewTemplate {
  title: string;
  body: string;
}

/** Letters grouped by horseshoes given (index 0 = 1 horseshoe). */
export const REVIEW_TEMPLATES: readonly (readonly ReviewTemplate[])[] = [
  [
    {
      title: 'O burro empacou',
      body: 'Empacou na porteira do vizinho e lá ficou. Mandei buscar com a carroça do compadre.',
    },
    {
      title: 'Não era o que eu pensava',
      body: 'Pensei que fosse maior. O caixeiro disse que eu pensei errado. Talvez tenha razão.',
    },
  ],
  [
    {
      title: 'Veio meio torto',
      body: 'Chegou um pouco amassado. O cocheiro culpou a ponte, a ponte não se defendeu.',
    },
    {
      title: 'Demorou uma quaresma',
      body: 'Encomendei no Carnaval e chegou na Páscoa. Pelo menos veio benzido.',
    },
  ],
  [
    {
      title: 'Atrasou por causa do rio',
      body: 'A ponte estava fechada, mas o telegrama avisou com antecedência. Gostei da honestidade.',
    },
    { title: 'Cumpre o prometido', body: 'Nem mais, nem menos. Como o padre na missa das sete.' },
    {
      title: 'Bom, com ressalvas',
      body: 'A mercadoria é boa; a embalagem chegou com cheiro de cavalo.',
    },
  ],
  [
    {
      title: 'Bom, mas o cavalo comeu a fita',
      body: 'Produto excelente. Faltou só um pedaço da embalagem, que o cocheiro jura que foi o vento.',
    },
    {
      title: 'Quase perfeito',
      body: 'Só não dou cinco ferraduras porque o burro chegou de mau humor.',
    },
    { title: 'Recomendo ao compadre', body: 'Já comprei outro para dar de presente no batizado.' },
  ],
  [
    {
      title: 'Chegou inteirinho',
      body: 'O burro demorou, mas trouxe junto um bilhete muito educado. Recomendo.',
    },
    {
      title: 'Melhor que na capital',
      body: 'Paguei com três galinhas e ainda me deram troco em ovos.',
    },
    {
      title: 'Vale cada vintém',
      body: 'Minha avó examinou com a lupa e aprovou. Isso não acontece desde 1870.',
    },
    {
      title: 'Comprarei de novo',
      body: 'O cocheiro foi tão educado que convidei para o café. Ficou para o almoço.',
    },
  ],
];
