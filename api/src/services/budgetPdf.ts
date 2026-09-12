import PDFDocument from "pdfkit";

export type BudgetItemForPdf = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

export type BudgetForPdf = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  issue_date: string;
  valid_until: string | null;
  discount: number;
  notes: string | null;

  client:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;

  items: BudgetItemForPdf[] | null;
};

const COLORS = {
  primary: "#16324f",
  secondary: "#17a398",
  text: "#263238",
  muted: "#65777f",
  border: "#dbe3e5",
  light: "#f4f7f6",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(date: string | null) {
  if (!date) {
    return "Não informada";
  }

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function getClientName(client: BudgetForPdf["client"]) {
  if (Array.isArray(client)) {
    return client[0]?.name ?? "Cliente não informado";
  }

  return client?.name ?? "Cliente não informado";
}

function drawTableHeader(document: PDFKit.PDFDocument, y: number) {
  document.rect(45, y, 505, 25).fill(COLORS.primary);

  document
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SERVIÇO", 53, y + 8, {
      width: 195,
    })
    .text("UN.", 260, y + 8, {
      width: 42,
      align: "center",
    })
    .text("QTD.", 310, y + 8, {
      width: 45,
      align: "right",
    })
    .text("PREÇO", 365, y + 8, {
      width: 80,
      align: "right",
    })
    .text("TOTAL", 455, y + 8, {
      width: 87,
      align: "right",
    });
}

export function generateBudgetPdf(budget: BudgetForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 45,
      bufferPages: true,

      info: {
        Title: `Orçamento ${budget.code}`,
        Subject: budget.title,
        Author: "Aplicativo de Gestão de Obras",
      },
    });

    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    const pageWidth = document.page.width;

    document.rect(0, 0, pageWidth, 120).fill(COLORS.primary);

    document
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(25)
      .text("ORÇAMENTO", 45, 38);

    document
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#cdece8")
      .text(`Código: ${budget.code}`, 45, 73);

    document
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#ffffff")
      .text(budget.title, 300, 42, {
        width: 250,
        align: "right",
      });

    document.y = 145;

    document
      .fillColor(COLORS.primary)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("CLIENTE");

    document
      .fillColor(COLORS.text)
      .font("Helvetica")
      .fontSize(11)
      .text(getClientName(budget.client), {
        width: 300,
      });

    document
      .fillColor(COLORS.muted)
      .fontSize(9)
      .text(
        `Emissão: ${formatDate(budget.issue_date)}  |  Validade: ${formatDate(
          budget.valid_until,
        )}`,
        340,
        145,
        {
          width: 210,
          align: "right",
        },
      );

    if (budget.description) {
      document
        .moveDown(1)
        .fillColor(COLORS.muted)
        .fontSize(9)
        .text(budget.description);
    }

    const sortedItems = [...(budget.items ?? [])].sort(
      (first, second) => first.sort_order - second.sort_order,
    );

    let currentY = Math.max(document.y + 25, 220);

    drawTableHeader(document, currentY);

    currentY += 25;

    let subtotal = 0;

    sortedItems.forEach((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const itemTotal = quantity * unitPrice;

      subtotal += itemTotal;

      const nameHeight = document.heightOfString(item.name, {
        width: 195,
      });

      const rowHeight = Math.max(nameHeight + 18, 38);

      if (currentY + rowHeight > document.page.height - 140) {
        document.addPage();

        currentY = 50;

        drawTableHeader(document, currentY);

        currentY += 25;
      }

      if (sortedItems.indexOf(item) % 2 === 0) {
        document.rect(45, currentY, 505, rowHeight).fill(COLORS.light);
      }

      document
        .fillColor(COLORS.text)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(item.name, 53, currentY + 11, {
          width: 195,
        });

      document
        .font("Helvetica")
        .fillColor(COLORS.muted)
        .text(item.unit, 260, currentY + 11, {
          width: 42,
          align: "center",
        })
        .text(String(quantity), 310, currentY + 11, {
          width: 45,
          align: "right",
        })
        .text(formatCurrency(unitPrice), 365, currentY + 11, {
          width: 80,
          align: "right",
        })
        .font("Helvetica-Bold")
        .fillColor(COLORS.primary)
        .text(formatCurrency(itemTotal), 455, currentY + 11, {
          width: 87,
          align: "right",
        });

      document
        .moveTo(45, currentY + rowHeight)
        .lineTo(550, currentY + rowHeight)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();

      currentY += rowHeight;
    });

    if (sortedItems.length === 0) {
      document
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(10)
        .text("Nenhum item foi adicionado ao orçamento.", 45, currentY + 18, {
          width: 505,
          align: "center",
        });

      currentY += 55;
    }

    const discount = Number(budget.discount ?? 0);
    const total = Math.max(subtotal - discount, 0);

    if (currentY > document.page.height - 190) {
      document.addPage();
      currentY = 60;
    } else {
      currentY += 25;
    }

    const summaryX = 340;
    const summaryWidth = 210;

    document
      .roundedRect(summaryX, currentY, summaryWidth, 105, 10)
      .fill(COLORS.light);

    document
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9)
      .text("Subtotal", summaryX + 15, currentY + 17)
      .text(formatCurrency(subtotal), summaryX + 95, currentY + 17, {
        width: 100,
        align: "right",
      })
      .text("Desconto", summaryX + 15, currentY + 42)
      .text(formatCurrency(discount), summaryX + 95, currentY + 42, {
        width: 100,
        align: "right",
      });

    document
      .moveTo(summaryX + 15, currentY + 65)
      .lineTo(summaryX + 195, currentY + 65)
      .strokeColor(COLORS.border)
      .stroke();

    document
      .fillColor(COLORS.primary)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("TOTAL", summaryX + 15, currentY + 77)
      .text(formatCurrency(total), summaryX + 80, currentY + 77, {
        width: 115,
        align: "right",
      });

    if (budget.notes) {
      document
        .fillColor(COLORS.primary)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("OBSERVAÇÕES", 45, currentY + 5);

      document
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(9)
        .text(budget.notes, 45, currentY + 23, {
          width: 260,
          lineGap: 3,
        });
    }

    const pageRange = document.bufferedPageRange();

    for (
      let pageIndex = pageRange.start;
      pageIndex < pageRange.start + pageRange.count;
      pageIndex += 1
    ) {
      document.switchToPage(pageIndex);

      document
        .fillColor("#87959d")
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Documento gerado pelo aplicativo • Página ${
            pageIndex + 1
          } de ${pageRange.count}`,
          45,
          document.page.height - 30,
          {
            width: 505,
            align: "center",
            lineBreak: false,
          },
        );
    }

    document.end();
  });
}
