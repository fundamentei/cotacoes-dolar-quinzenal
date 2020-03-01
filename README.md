## `cotacoes-dolar-quinzenal`

Para a declaração dos dividendos recebidos das ações americanas (e REITs), é necessário que a conversão da cotação seja referente ao último dia último da primeira quinzena do mês anterior ao rendimento. Se você recebeu em **Janeiro/2019**, o valor da cotação a ser utilizado será referente a **Dezembro/2018**, mais especificamente: **14/12/2018**.

O código nesse repositório serve para calcular essas datas considerando feriados Brasileiros e dias úteis para achar as datas certas em conformidade com a regra. Com as datas em mãos, as cotações de compra e venda do dólar são extraídas da API do Banco Central. O periodo dos dados é de 2017 até 2020.

Utilize essa planilha no Excel/Google Spreadsheets como referência para facilitar o calculo do imposto à ser declarado.

[Clique aqui para visualizar ou baixar a planilha completa com os dados](https://github.com/fundamentei/cotacoes-dolar-quinzenal/blob/master/Cotacoes%20do%20dolar%20compra%20e%20venda%20quinzenas%202017%20-%202020.csv).

**Fonte das cotações de compra e venda do dólar**: https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial=%2712-15-2016%27&@dataFinalCotacao=%2711-13-2020%27
