// Páginas legais (Termos de Uso / Política de Privacidade) — profissionalização do produto,
// pedido do usuário em 2026-08-24 ("focar em profissionalizar o jogo como produto"). Rotas
// próprias (`/termos`, `/privacidade`, ver App.tsx), carregadas sob demanda: a criança nunca
// baixa esse chunk no fluxo normal de jogo.
//
// Conteúdo escrito refletindo as práticas REAIS do produto (checado no código, não suposto):
// nenhuma coleta de dado pessoal da criança (nickname escolhido, tudo em localStorage — ver
// `docs/prompts/01-seguranca.md`), assinatura via Stripe (nunca vemos dado de cartão), Neon
// (banco + login do responsável) e Cloudflare (hospedagem/relé) como subprocessadores. Isso é
// uma minuta funcional pro estágio atual do produto (ainda em modo teste do Stripe) — recomendo
// revisão por um advogado antes de sair do modo teste e cobrar de verdade.
interface LegalPageProps {
  page: 'termos' | 'privacidade'
}

function TermosDeUso() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="legal-updated">Última atualização: 24 de agosto de 2026.</p>

      <p>
        Bem-vindo(a) à Missão Aprender. Estes Termos de Uso regem o uso do jogo e do portal dos
        responsáveis (<code>/familia</code>), operados por RVS Tecnologia. Ao criar uma conta de
        responsável ou assinar o Plano Família, você concorda com estes termos.
      </p>

      <h2>1. Quem pode usar</h2>
      <p>
        A Missão Aprender é um jogo educativo feito para crianças, mas <strong>a conta e a
        assinatura são sempre do responsável</strong> — um adulto (18 anos ou mais) legalmente
        responsável pela criança. A criança nunca cria conta, nunca informa e-mail ou senha, e
        nunca acessa o portal dos responsáveis.
      </p>

      <h2>2. O que é gratuito e o que é pago</h2>
      <p>
        Todo o conteúdo educativo do jogo — missões, progressão, cooperação entre jogadores,
        níveis, badges — é <strong>100% gratuito e sempre será</strong>. O Plano Família (R$ 4,99
        por mês) desbloqueia apenas itens cosméticos exclusivos (skins, chapéus, roupas). Nunca
        vendemos vantagem educacional, atalho de progressão ou qualquer coisa que afete o
        aprendizado da criança.
      </p>

      <h2>3. Assinatura, cobrança e cancelamento</h2>
      <ul>
        <li>A cobrança é mensal e recorrente, processada pela Stripe, através do cartão informado pelo responsável.</li>
        <li>A assinatura renova automaticamente a cada mês até ser cancelada.</li>
        <li>
          Você pode cancelar a qualquer momento pelo portal <code>/familia</code>, sem multa e sem
          precisar justificar. O acesso aos itens exclusivos continua até o fim do período já
          pago; não há reembolso proporcional do período em curso, exceto conforme a seção 4.
        </li>
        <li>Não cobramos taxa de adesão nem exigimos fidelidade mínima.</li>
      </ul>

      <h2>4. Direito de arrependimento</h2>
      <p>
        Como a assinatura é contratada fora de um estabelecimento físico, você tem até 7 (sete)
        dias corridos após a primeira contratação para desistir e receber o valor pago de volta
        integralmente, conforme o art. 49 do Código de Defesa do Consumidor. Basta entrar em
        contato dentro desse prazo.
      </p>

      <h2>5. Segurança e uso aceitável</h2>
      <ul>
        <li>Não existe chat de texto livre no jogo — só mensagens pré-definidas, exatamente para proteger as crianças de contato indevido.</li>
        <li>É proibido tentar contornar essas proteções, se passar por outro jogador, ou usar o jogo para qualquer finalidade diferente do uso pretendido.</li>
        <li>Podemos suspender ou encerrar contas que violem estes termos ou representem risco a outros usuários, especialmente crianças.</li>
      </ul>

      <h2>6. Propriedade do conteúdo</h2>
      <p>
        O jogo, seu design, personagens e itens cosméticos pertencem à RVS Tecnologia. A
        assinatura dá o direito de uso desses itens dentro do jogo, não a propriedade sobre eles.
      </p>

      <h2>7. Disponibilidade e responsabilidade</h2>
      <p>
        Fazemos o possível para manter o jogo disponível, mas não garantimos operação
        ininterrupta. Não somos responsáveis por danos indiretos decorrentes de indisponibilidade
        temporária do serviço. Nada nestes termos limita direitos que não podem ser limitados
        pelo Código de Defesa do Consumidor.
      </p>

      <h2>8. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos conforme o produto evolui. Mudanças relevantes serão
        avisadas ao responsável pelo portal ou pelo e-mail cadastrado.
      </p>

      <h2>9. Contato e lei aplicável</h2>
      <p>
        Dúvidas, cancelamento ou solicitações: <code>contato@missaoaprendizado.com</code>. Estes
        termos são regidos pela lei brasileira.
      </p>
    </>
  )
}

function PoliticaDePrivacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="legal-updated">Última atualização: 3 de setembro de 2026.</p>

      <p>
        Esta política explica quais dados a Missão Aprender coleta, de quem, e por quê. Seguimos
        o princípio de minimização de dados: só coletamos o estritamente necessário pra o jogo e
        a assinatura funcionarem, especialmente quando se trata de uma criança.
      </p>

      <h2>1. Dados da criança: o mínimo possível</h2>
      <p>
        A criança <strong>nunca cria conta</strong>. Os únicos dados que existem sobre a criança
        são:
      </p>
      <ul>
        <li>Um apelido escolhido por ela (nunca o nome real, nunca solicitado).</li>
        <li>Progresso do jogo (missões concluídas, moedas, badges) e escolhas de personalização.</li>
      </ul>
      <p>
        Esses dados ficam guardados <strong>só no navegador/dispositivo da própria criança</strong>
        (<code>localStorage</code>), nunca em um servidor associado a uma identidade. Quando a
        criança joga em modo multiplayer, o apelido e a posição no jogo são transmitidos
        momentaneamente para os outros jogadores conectados, sem ficar salvos em lugar nenhum
        depois que a sessão termina.
      </p>
      <p>
        Não existe chat de texto livre — só mensagens pré-definidas de uma lista fechada — então
        não há como uma criança digitar e enviar um dado pessoal (telefone, endereço, etc.) para
        outro jogador.
      </p>

      <h2>2. Dados do responsável</h2>
      <p>Quando um responsável cria uma conta no portal (<code>/familia</code>), coletamos:</p>
      <ul>
        <li>Nome e e-mail, usados para login e comunicação sobre a assinatura.</li>
        <li>
          Dados de pagamento: processados inteiramente pela Stripe. Nunca vemos, recebemos ou
          guardamos o número do cartão — a Stripe nos informa só o status da assinatura.
        </li>
      </ul>

      <h2>3. Com quem compartilhamos dados (subprocessadores)</h2>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Função</th>
            <th>O que recebe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Neon</td>
            <td>Banco de dados e login do responsável</td>
            <td>Nome, e-mail, senha (hash)</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Processamento de pagamento</td>
            <td>Dados de pagamento — nunca passam pela Missão Aprender</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>Hospedagem, servidor de multiplayer, domínio</td>
            <td>Dados técnicos de conexão (IP, por exemplo)</td>
          </tr>
        </tbody>
      </table>
      <p>Não vendemos dado nenhum a terceiros, nem usamos os dados pra publicidade.</p>

      <h2>4. Cookies</h2>
      <p>
        Usamos um cookie de sessão para manter o responsável logado no portal, e a Stripe usa
        cookies próprios durante o checkout de pagamento. Não usamos cookies de rastreamento
        publicitário nem ferramentas de analytics de terceiros.
      </p>

      <h2>5. Seus direitos (LGPD)</h2>
      <p>
        Como responsável, você pode a qualquer momento baixar uma cópia de todos os seus dados
        (portabilidade) ou excluir sua conta e todos os dados associados a ela — direto pelo
        portal <code>/familia</code>, na seção &ldquo;Meus dados&rdquo;, sem precisar entrar em
        contato. A exclusão cancela sua assinatura imediatamente e apaga sua conta, códigos de
        pareamento, aparelhos vinculados e qualquer progresso da criança que tenha sido
        sincronizado — o jogo continua gratuito e a criança pode continuar jogando, só perde o
        vínculo com sua conta e o acesso aos itens exclusivos. Se preferir, também pode pedir
        acesso, correção ou exclusão dos seus dados (e dos dados de progresso salvos localmente
        da criança, apagando-os do dispositivo) por e-mail:
        <code> contato@missaoaprendizado.com</code>.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Mantemos os dados do responsável enquanto a conta existir. Ao excluir a conta (pelo portal
        ou por e-mail), removemos os dados associados a ela imediatamente, exceto o mínimo exigido
        por obrigação legal (ex. registros fiscais de pagamento, mantidos pela própria Stripe).
        Códigos de pareamento não usados ou já expirados são apagados automaticamente depois de 30
        dias — eles só servem dentro dos 15 minutos de validade, então não há motivo pra guardá-los
        por mais tempo que isso.
      </p>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre privacidade: <code>contato@missaoaprendizado.com</code>.
      </p>
    </>
  )
}

export function LegalPage({ page }: LegalPageProps) {
  return (
    <div className="screen legal-page">
      <a href="/familia" className="legal-back-link">
        ← Voltar
      </a>
      {page === 'termos' ? <TermosDeUso /> : <PoliticaDePrivacidade />}
    </div>
  )
}
