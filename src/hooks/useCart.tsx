import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productFoundIndex = cart.findIndex(product => productId === product.id);

      if (productFoundIndex >= 0) {
        const stockProductInfos = (await api.get(`/stock/${productId}`)).data;

        if (stockProductInfos.amount < cart[productFoundIndex].amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const productUpdated = {
          ...cart[productFoundIndex],
          amount: cart[productFoundIndex].amount + 1
        };

        const newCart = cart.map(product => {
          if (productId === product.id) {
            return productUpdated
          }
          else {
            return product
          }
        });

        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }
      else {
        const product = (await api.get(`/products/${productId}`)).data

        const productWithAmount = { ...product, amount: 1 };
        const newCart = [...cart, productWithAmount];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);
      if (!productExists)
        throw new Error('Produto não existe no carrinho');

      const newCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error('Alteraçáo inválida')
      }

      const productStocked = (await api.get(`/stock/${productId}`)).data;

      if (amount > productStocked.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }


      const newCart = cart.map(product => {
        if (productId === product.id) {
          return {
            ...product,
            amount,
          }
        }
        else {
          return product
        }
      });

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart));
      setCart(newCart);

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
