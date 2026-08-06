import './WikiPage.css';

export function WikiPage() {
  return (
    <div className="wiki">
      <header className="wiki__header">
        <h1>Wiki</h1>
        <p>Explicações de conceitos do Portal, para consultares sempre que precisares.</p>
      </header>

      <section className="wiki__article">
        <h2>Campanhas vs Templates vs Flows</h2>
        <p className="wiki__intro">
          Estes três conceitos confundem-se com frequência, porque todos tocam em "enviar algo a um contacto via
          WhatsApp" — mas cada um resolve um problema diferente, e combinam-se em vez de se substituírem.
        </p>

        <table className="wiki__table">
          <thead>
            <tr>
              <th></th>
              <th>O que é</th>
              <th>A que pergunta responde</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Template</strong>
              </td>
              <td>O texto aprovado que uma mensagem iniciada pelo negócio pode usar</td>
              <td>
                <em>"O que é que posso dizer?"</em>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Campanha</strong>
              </td>
              <td>Uma mensagem + uma regra de quando enviar</td>
              <td>
                <em>"Quando é que digo?"</em>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Flow</strong>
              </td>
              <td>Um formulário nativo multi-ecrã para recolher respostas estruturadas</td>
              <td>
                <em>"Como recolho uma resposta estruturada, em vez de só mandar texto?"</em>
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Nenhum funciona sozinho em todas as situações — cada um depende de outra coisa para conseguir chegar a um
          contacto de forma útil.
        </p>

        <h3>Template de Mensagem</h3>
        <p>
          <strong>Para que serve:</strong> a Meta só permite texto livre dentro de uma janela aberta de 24h de
          atendimento (o contacto escreveu-te recentemente). Fora dessa janela, uma mensagem iniciada pelo negócio
          tem de usar um template pré-aprovado, ou arrisca rejeição / dano ao <em>quality rating</em> do número. Um
          Template é esse texto pré-aprovado, gerido a partir deste Portal em vez do Meta Business Manager.
        </p>
        <p>
          <strong>Sozinho:</strong> um Template parado, sem uso, não faz nada — é só texto aprovado à espera de ser
          enviado por algo.
        </p>
        <p>
          <strong>Ciclo de vida:</strong> Rascunho → submeter para revisão da Meta → Aprovado/Rejeitado/Pausado.
          Depois de submetido, o corpo não pode ser editado — tem de se criar um Template novo.
        </p>

        <h3>Campanha</h3>
        <p>
          <strong>Para que serve:</strong> automatizar quando uma mensagem sai, sem um humano ter de se lembrar e
          agir. Quatro tipos: <em>Welcome</em> (X dias depois da inscrição), <em>Birthday</em> (todos os anos),{' '}
          <em>Reactivation</em> (depois de X dias inativo), <em>Manual</em> (um operador dispara à mão, para
          destinatários escolhidos).
        </p>
        <p>
          <strong>Sozinha:</strong> uma Campanha consegue enviar texto livre — mas só é seguro se for provável que
          caia dentro de uma janela aberta de 24h, o que mensagens de fidelização (iniciadas pelo negócio, não uma
          resposta a algo que o contacto acabou de dizer) geralmente não são.
        </p>
        <p>
          <strong>O que significa "ligar a um Template":</strong> em vez de enviar o seu próprio corpo de texto
          livre, a Campanha passa a enviar através de um Template Aprovado — o Template fornece o texto conforme e
          pré-aprovado; a Campanha continua a fornecer a regra de disparo e os valores por destinatário
          (<code>{'{FirstName}'}</code>, <code>{'{GymName}'}</code>, etc.). Uma Campanha sem Template ligado continua
          a funcionar, mas é exatamente a situação que o Dashboard de Conformidade assinala como risco.
        </p>

        <h3>WhatsApp Flow</h3>
        <p>
          <strong>Para que serve:</strong> recolher uma resposta estruturada — escolha múltipla, seleção múltipla,
          um formulário com vários campos — como um ecrã nativo do WhatsApp, em vez de uma cadeia de toques em
          botões/listas ou texto livre que a IA teria de interpretar.
        </p>
        <p>
          <strong>Sozinho:</strong> um Flow tem de ser disparado por algo — uma mensagem com um botão de "abrir este
          Flow", enviada manualmente (a partir deste Portal, para testar) ou como parte de alguma outra lógica que se
          construa.
        </p>
        <p>
          <strong>Estático vs Dinâmico:</strong> um Flow cujas perguntas/opções estão inteiramente fixas no desenho é
          estático — sem configuração extra necessária. Um Flow que precisa de dados ao vivo (ex: a lista atual de
          aulas do gym) é dinâmico — tem de ser marcado como tal, e precisa de um URL de endpoint de Data Exchange
          configurado antes de poder publicar.
        </p>
        <p className="wiki__note">
          Importante: os Flows <strong>não</strong> são um mecanismo de conformidade com as regras do WhatsApp — isso
          é papel dos Templates. Os Flows servem só para uma experiência mais rica de recolha de dados.
        </p>

        <h3>Como se combinam na prática</h3>
        <p>
          Um exemplo realista: uma <strong>Campanha de Reativação</strong> (dispara depois de 30 dias inativo) está
          ligada a um <strong>Template Aprovado</strong> ("Sentimos a tua falta, {'{FirstName}'}!") para conseguir
          chegar a alguém em conformidade fora da janela de 24h. Essa mensagem podia, por sua vez, conter uma chamada
          à ação que leva o contacto a abrir um <strong>Flow</strong> para atualizar as suas preferências de aulas.
          Três conceitos diferentes, três funções diferentes, a trabalhar juntos — não três nomes para a mesma coisa.
        </p>
      </section>
    </div>
  );
}
