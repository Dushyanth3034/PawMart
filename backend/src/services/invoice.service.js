import PDFDocument from 'pdfkit';

/**
 * Generates a professional PawMart A4 Invoice PDF and streams it directly to the response.
 * @param {Object} order - Full order object with buyer, address, payment, orderItems & product.
 * @param {Object} res - Express HTTP response stream.
 */
export function generateInvoicePDF(order, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Stream PDF directly to Express response
  doc.pipe(res);

  const invoiceNum = `INV-2026-${order.id.slice(-6).toUpperCase()}`;
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // --- Header ---
  // Brand Logo & Title
  doc
    .fillColor('#FF5A5F')
    .fontSize(26)
    .font('Helvetica-Bold')
    .text('PawMart', 40, 40);

  doc
    .fillColor('#6B7280')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('YOUR PREMIUM PET MARKETPLACE', 40, 70);

  // Invoice Title Right
  doc
    .fillColor('#1F2937')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('INVOICE', 350, 40, { align: 'right', width: 205 });

  doc
    .fillColor('#4B5563')
    .fontSize(9)
    .font('Helvetica')
    .text(`Invoice No: ${invoiceNum}`, 350, 68, { align: 'right', width: 205 })
    .text(`Order ID: #${order.id.slice(-8).toUpperCase()}`, 350, 82, { align: 'right', width: 205 })
    .text(`Order Date: ${formattedDate}`, 350, 96, { align: 'right', width: 205 });

  // Divider line
  doc
    .moveTo(40, 115)
    .lineTo(555, 115)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  // --- Bill To & Delivery Address ---
  const yDetails = 130;

  // Bill To
  doc
    .fillColor('#9CA3AF')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('BILL TO', 40, yDetails);

  const buyerName = order.buyer ? `${order.buyer.firstName} ${order.buyer.lastName}` : 'Valued Customer';
  const buyerEmail = order.buyer?.email || 'N/A';
  const buyerPhone = order.buyer?.phone || 'N/A';

  doc
    .fillColor('#1F2937')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(buyerName, 40, yDetails + 14)
    .fillColor('#4B5563')
    .fontSize(9)
    .font('Helvetica')
    .text(buyerEmail, 40, yDetails + 30)
    .text(`Phone: ${buyerPhone}`, 40, yDetails + 44);

  // Delivery Address
  doc
    .fillColor('#9CA3AF')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('DELIVERY ADDRESS', 300, yDetails);

  const addr = order.address;
  const streetStr = addr?.street || 'N/A';
  const cityStateStr = addr ? `${addr.city}, ${addr.state} - ${addr.postalCode}` : 'N/A';
  const countryStr = addr?.country || 'India';

  doc
    .fillColor('#1F2937')
    .fontSize(10)
    .font('Helvetica')
    .text(streetStr, 300, yDetails + 14, { width: 255 })
    .text(cityStateStr, 300, yDetails + 30)
    .text(countryStr, 300, yDetails + 44);

  // Divider line
  doc
    .moveTo(40, 205)
    .lineTo(555, 205)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  // --- Order Items Table ---
  let yTable = 220;

  // Table Header Box
  doc
    .rect(40, yTable, 515, 24)
    .fill('#F9FAFB');

  doc
    .fillColor('#374151')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('ITEM DESCRIPTION', 50, yTable + 7)
    .text('QTY', 330, yTable + 7, { width: 40, align: 'center' })
    .text('UNIT PRICE', 380, yTable + 7, { width: 80, align: 'right' })
    .text('AMOUNT', 470, yTable + 7, { width: 75, align: 'right' });

  yTable += 30;

  // Table Body Rows
  let itemsSubtotal = 0;
  for (const item of order.orderItems) {
    const productName = item.product?.name || 'PawMart Product';
    const variantInfo = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
    const qty = item.quantity;
    const unitPrice = item.price;
    const lineTotal = qty * unitPrice;
    itemsSubtotal += lineTotal;

    doc
      .fillColor('#1F2937')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(productName, 50, yTable, { width: 270 });

    if (variantInfo) {
      doc
        .fillColor('#6B7280')
        .fontSize(8)
        .font('Helvetica')
        .text(`Variant: ${variantInfo}`, 50, yTable + 12, { width: 270 });
    }

    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(qty.toString(), 330, yTable, { width: 40, align: 'center' })
      .text(`INR ${unitPrice.toFixed(2)}`, 380, yTable, { width: 80, align: 'right' })
      .text(`INR ${lineTotal.toFixed(2)}`, 470, yTable, { width: 75, align: 'right' });

    yTable += variantInfo ? 28 : 22;

    // Row separator
    doc
      .moveTo(40, yTable - 4)
      .lineTo(555, yTable - 4)
      .strokeColor('#F3F4F6')
      .lineWidth(0.5)
      .stroke();
  }

  yTable += 10;

  // --- Financial Summary Box ---
  const summaryX = 350;
  const summaryWidth = 205;

  doc
    .moveTo(summaryX, yTable)
    .lineTo(555, yTable)
    .strokeColor('#E5E7EB')
    .lineWidth(1)
    .stroke();

  yTable += 10;

  // Subtotal
  doc
    .fillColor('#4B5563')
    .fontSize(10)
    .font('Helvetica')
    .text('Subtotal:', summaryX, yTable)
    .text(`INR ${itemsSubtotal.toFixed(2)}`, summaryX, yTable, { width: summaryWidth, align: 'right' });

  yTable += 16;

  // Shipping
  const shippingCharge = 0;
  doc
    .fillColor('#4B5563')
    .fontSize(10)
    .font('Helvetica')
    .text('Delivery / Shipping:', summaryX, yTable)
    .text(`INR ${shippingCharge.toFixed(2)}`, summaryX, yTable, { width: summaryWidth, align: 'right' });

  yTable += 20;

  // Grand Total Box
  doc
    .rect(summaryX - 10, yTable - 4, summaryWidth + 20, 28)
    .fill('#FF5A5F');

  doc
    .fillColor('#FFFFFF')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Grand Total:', summaryX, yTable + 3)
    .text(`INR ${order.total.toFixed(2)}`, summaryX, yTable + 3, { width: summaryWidth, align: 'right' });

  yTable += 45;

  // --- Payment & Order Status Box ---
  doc
    .rect(40, yTable, 515, 55)
    .fill('#F9FAFB')
    .stroke('#E5E7EB');

  const payMethod = order.payment?.paymentMethod || 'RAZORPAY';
  const payStatus = order.payment?.status || 'COMPLETED';

  doc
    .fillColor('#374151')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('PAYMENT DETAILS', 55, yTable + 10)
    .fillColor('#6B7280')
    .fontSize(9)
    .font('Helvetica')
    .text(`Method: ${payMethod.toUpperCase()}`, 55, yTable + 24)
    .text(`Status: ${payStatus.toUpperCase()}`, 55, yTable + 36);

  doc
    .fillColor('#374151')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('ORDER STATUS', 300, yTable + 10)
    .fillColor('#10B981')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(order.status.toUpperCase(), 300, yTable + 26);

  // --- Footer ---
  doc
    .fillColor('#9CA3AF')
    .fontSize(9)
    .font('Helvetica')
    .text('Thank you for shopping with PawMart!', 40, 780, { align: 'center', width: 515 })
    .text('For support or queries, contact support@pawmart.com', 40, 794, { align: 'center', width: 515 });

  doc.end();
}
