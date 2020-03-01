import {
  addWeeks,
  differenceInBusinessDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  isWeekend,
  lightFormat,
  max,
  min,
  parse,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths
} from "date-fns";
import request from "request-promise";
import { format } from "util";

(async () => {
  const holidays = await fetchBrazilianHolidayDates();

  const dateRange = eachMonthOfInterval({
    start: startOfYear(parse("2017-01-01", "yyyy-MM-dd", new Date())),
    end: startOfYear(parse("2021-01-01", "yyyy-MM-dd", new Date()))
  });

  const dates = dateRange.map(dateOfReference => {
    const startOfPreviousMonth = startOfMonth(subMonths(dateOfReference, 1));
    const firstFortnightOfPreviousMonth = addWeeks(startOfPreviousMonth, 2);
    const lastBusinessDayOfFirstFortnight = lastBusinessDay(
      firstFortnightOfPreviousMonth,
      holidays
    );

    return {
      dateOfReference,
      startOfPreviousMonth,
      lastBusinessDayOfFirstFortnight
    };
  });

  const fortnights = dates.map(
    ({ lastBusinessDayOfFirstFortnight }) => lastBusinessDayOfFirstFortnight
  );

  const minFortnight = min(fortnights);
  const maxFortnight = max(fortnights);

  const allQuotes = await getUsdQuotes(minFortnight, maxFortnight);

  const quotesForFortnights = allQuotes.filter(candidate => {
    return fortnights.some(date => {
      return isEqualYmd(candidate.day, date);
    });
  });

  console.log(
    [
      "Data",
      "Mês Anterior",
      "Último dia útil da primeira quinzena do mês anterior",
      "Cotação USD Compra",
      "Cotação USD Venda",
      "Data Cotação"
    ].join("\t")
  );

  dates.forEach(entry => {
    const quote = quotesForFortnights.find(candidate => {
      return isEqualYmd(candidate.day, entry.lastBusinessDayOfFirstFortnight);
    });

    if (!quote) {
      return;
    }

    console.log(
      [
        lightFormat(entry.dateOfReference, "MM/yyyy"),
        lightFormat(entry.startOfPreviousMonth, "MM/yyyy"),
        lightFormat(entry.lastBusinessDayOfFirstFortnight, "dd/MM/yyyy"),
        quote.buy.toString().replace(".", ","),
        quote.sell.toString().replace(".", ","),
        lightFormat(quote.day, "dd/MM/yyyy")
      ].join("\t")
    );
  });
})();

function lastBusinessDay(ofDate: Date, holidays: Date[]) {
  if (isWeekend(ofDate)) {
    return lastBusinessDay(subDays(ofDate, 1), holidays);
  }

  if (holidays.length > 0) {
    const isHoliday = holidays.some(holiday => {
      return isEqualYmd(holiday, ofDate);
    });

    if (isHoliday) {
      return lastBusinessDay(subDays(ofDate, 1), holidays);
    }
  }

  return ofDate;
}

async function getUsdQuotes(startOfPeriod: Date, endOfPeriod: Date) {
  const dataInicial = escape(`'${lightFormat(startOfPeriod, "MM-dd-yyyy")}'`);
  const dataFinalCotacao = escape(
    `'${lightFormat(endOfPeriod, "MM-dd-yyyy")}'`
  );

  const allQuotesOfPeriod = format(
    "%s(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial=%s&@dataFinalCotacao=%s&$top=%s&$format=json",
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo",
    dataInicial,
    dataFinalCotacao,
    differenceInBusinessDays(endOfPeriod, startOfPeriod)
  );

  console.log("Cotações %s", allQuotesOfPeriod);

  const response: OlindaCotacaoDolarPeriodo = await request.get(
    allQuotesOfPeriod,
    {
      json: true,
      resolveWithFullResponse: false
    }
  );

  const daysOfInterval = eachDayOfInterval({
    start: startOfPeriod,
    end: endOfPeriod
  });

  return daysOfInterval
    .map(day => {
      const foundQuote = response.value.find(candidate => {
        return isEqualYmd(
          day,
          parse(
            candidate.dataHoraCotacao.substring(0, "yyyy-MM-dd".length),
            "yyyy-MM-dd",
            new Date()
          )
        );
      });

      if (!foundQuote) {
        return null;
      }

      return {
        buy: foundQuote.cotacaoCompra,
        sell: foundQuote.cotacaoVenda,
        day
      };
    })
    .filter(notNull);
}

function notNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isEqualYmd(dateLeft: Date, dateRight: Date) {
  return (
    lightFormat(dateLeft, "yyyy-MM-dd") === lightFormat(dateRight, "yyyy-MM-dd")
  );
}

type OlindaCotacaoDolarPeriodo = {
  value: Array<{
    cotacaoCompra: number;
    cotacaoVenda: number;
    dataHoraCotacao: string;
  }>;
};

async function fetchBrazilianHolidayDates(): Promise<Date[]> {
  const calendarUrls = [
    "https://raw.githubusercontent.com/pagarme/business-calendar/master/data/brazil/2017.json",
    "https://raw.githubusercontent.com/pagarme/business-calendar/master/data/brazil/2018.json",
    "https://raw.githubusercontent.com/pagarme/business-calendar/master/data/brazil/2019.json",
    "https://raw.githubusercontent.com/pagarme/business-calendar/master/data/brazil/2020.json",
    "https://raw.githubusercontent.com/pagarme/business-calendar/master/data/brazil/2021.json"
  ];

  const allCalendars = await Promise.all(
    calendarUrls.map(async url => {
      const responseData: PagarMeBusinessCalendar = await request.get(url, {
        resolveWithFullResponse: false,
        json: true
      });

      return responseData;
    })
  );

  return allCalendars
    .map(jsonData => {
      return jsonData.calendar
        .map(day => {
          if (day.limited_financial_operation && day.holiday) {
            return parse(day.date, "yyyy-MM-dd", new Date());
          }

          return null;
        })
        .filter(notNull);
    })
    .flat()
    .sort((dateLeft, dateRight) => {
      return dateLeft.getTime() - dateRight.getTime();
    });
}

type PagarMeBusinessCalendar = {
  calendar: Array<{
    date: string;
    holiday: boolean;
    limited_financial_operation: boolean;
  }>;
};
