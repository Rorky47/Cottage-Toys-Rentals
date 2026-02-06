import { Form, useLoaderData } from "@remix-run/react";
import styles from "~/routes/_index/styles.module.css";
import type { loader } from "~/features/landing/index.server";

export default function LandingPage() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>CottageToys Products</h1>
        <p className={styles.text}>Track Shopify products by ID and pull live price + inventory.</p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Add products</strong>. Save the product ID you want the app to work with.
          </li>
          <li>
            <strong>Live data</strong>. Pull price and inventory directly from Shopify.
          </li>
          <li>
            <strong>Minimal</strong>. Just auth + product references + your logic.
          </li>
        </ul>
      </div>
    </div>
  );
}

