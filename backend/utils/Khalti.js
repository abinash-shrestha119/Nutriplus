// import dotenv from "dotenv";
// dotenv.config();

// export async function verifyKhaltiPayment(pidx) {
//   const response = await fetch(
//     "https://a.khalti.com/api/v2/epayment/lookup/",
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ pidx }),
//     }
//   );

//   const data = await response.json();

//   if (!response.ok) {
//     return { verified: false };
//   }

//   return {
//     verified: data.status === "Completed",
//     amount: data.total_amount / 100,
//     transactionId: data.transaction_id,
//   };
// }
