import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { savePaymentMethod } from "../../slices/cartSlice";

import { Button } from "react-bootstrap";
import FormContainer from "../../components/formContainer/formContainer";
import CheckoutSteps from "../../components/checkoutSteps/checkoutSteps";

const PaymentScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  useEffect(() => {
    if (!shippingAddress) {
      navigate("/shipping");
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod("Khalti"));
    navigate("/placeorder");
  };

  return (
    <FormContainer>
      <CheckoutSteps step1 step2 step3 />
      <h1 className="title-style">Payment Method</h1>

      <p>
        <strong>Selected Payment Method:</strong> Khalti
      </p>

      <Button
        type="button"
        className="regular-button-style"
        onClick={submitHandler}
      >
        Continue
      </Button>
    </FormContainer>
  );
};

export default PaymentScreen;
