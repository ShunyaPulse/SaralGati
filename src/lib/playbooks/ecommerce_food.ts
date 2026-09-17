import { MultiStepFlowDefinition } from './types';

export const ECOMMERCE_FOOD_PLAYBOOKS: MultiStepFlowDefinition[] = [
  // 1. Swiggy Food Order
  {
    id: 'swiggy_order_food',
    name: 'Order Food on Swiggy',
    category: 'ecommerce_food',
    triggerPatterns: ['khana mangwao swiggy', 'swiggy se order', 'mithai mangana', 'खाना मंगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search Dish / Restaurant',
        hindiInstruction: 'कदम 1/3: खाने या होटल का नाम खोजने के लिए सर्च पर दबाएं।',
        expectedKeywords: ['search', 'dish', 'restaurant', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Add Item to Cart',
        hindiInstruction: 'कदम 2/3: अपनी पसंद का खाना चुनने के लिए ADD दबाएं।',
        expectedKeywords: ['add', 'item', 'जोड़ें']
      },
      {
        stepNumber: 3,
        label: 'Proceed to Pay',
        hindiInstruction: 'कदम 3/3: खाना ऑर्डर करने के लिए Pay दबाएं।',
        expectedKeywords: ['pay', 'checkout', 'order', 'पे']
      }
    ]
  },

  // 2. Zomato Restaurant Search
  {
    id: 'zomato_restaurant_search',
    name: 'Order Food on Zomato',
    category: 'ecommerce_food',
    triggerPatterns: ['zomato se khana', 'biryani mangana zomato', 'zomato order', 'जोमैटो से खाना'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search Bar',
        hindiInstruction: 'कदम 1/3: खाने का नाम खोजने के लिए सर्च बार पर दबाएं।',
        expectedKeywords: ['search', 'zomato', 'restaurant', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Add Food Item',
        hindiInstruction: 'कदम 2/3: खाना कार्ट में जोड़ने के लिए ADD पर दबाएं।',
        expectedKeywords: ['add', 'item', 'जोड़ें']
      },
      {
        stepNumber: 3,
        label: 'Place Order',
        hindiInstruction: 'कदम 3/3: ऑर्डर पूरा करने के लिए Place Order पर दबाएं।',
        expectedKeywords: ['place order', 'pay', 'ऑर्डर']
      }
    ]
  },

  // 3. Blinkit Grocery 10-Min Order
  {
    id: 'blinkit_grocery_order',
    name: 'Order Grocery on Blinkit',
    category: 'ecommerce_food',
    triggerPatterns: ['rashan mangana blinkit', 'doodh dahi mangao', 'blinkit se saman', 'सब्जी राशन मंगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search Grocery Item',
        hindiInstruction: 'कदम 1/3: सामान (जैसे दूध, चीनी, चायपत्ती) खोजने के लिए सर्च पर दबाएं।',
        expectedKeywords: ['search', 'item', 'grocery', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Add to Cart',
        hindiInstruction: 'कदम 2/3: सामान जोड़ने के लिए ADD पर दबाएं।',
        expectedKeywords: ['add', 'cart', 'जोड़ें']
      },
      {
        stepNumber: 3,
        label: 'Proceed to Pay',
        hindiInstruction: 'कदम 3/3: घर मंगाने के लिए Proceed to Pay पर दबाएं।',
        expectedKeywords: ['pay', 'checkout', 'bill', 'पे']
      }
    ]
  },

  // 4. Zepto 10-Min Delivery
  {
    id: 'zepto_10min_delivery',
    name: 'Order Delivery on Zepto',
    category: 'ecommerce_food',
    triggerPatterns: ['zepto se saman', 'zepto grocery', 'jaldi rashan mangao', 'ज़ेप्टो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Search Products',
        hindiInstruction: 'कदम 1/3: सामान खोजने के लिए सर्च बॉक्स पर दबाएं।',
        expectedKeywords: ['search', 'find', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Add Items',
        hindiInstruction: 'कदम 2/3: सामान को कार्ट में जोड़ने के लिए ADD दबाएं।',
        expectedKeywords: ['add', 'cart', 'जोड़ें']
      },
      {
        stepNumber: 3,
        label: 'Order Now',
        hindiInstruction: 'कदम 3/3: 10 मिनट में मंगाने के लिए Pay Now पर दबाएं।',
        expectedKeywords: ['pay', 'order', 'पे']
      }
    ]
  },

  // 5. Amazon Product Search
  {
    id: 'amazon_search_product',
    name: 'Search Product on Amazon',
    category: 'ecommerce_food',
    triggerPatterns: ['amazon par saman dhoondho', 'amazon search', 'cheez khareedna amazon', 'अमेज़न सर्च'],
    steps: [
      {
        stepNumber: 1,
        label: 'Amazon Search Bar',
        hindiInstruction: 'कदम 1/2: जो सामान खोजना है, वह ऊपर Amazon सर्च बार में लिखें।',
        expectedKeywords: ['search', 'amazon', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Select Product',
        hindiInstruction: 'कदम 2/2: सामान की जानकारी और कीमत देखने के लिए उस पर दबाएं।',
        expectedKeywords: ['product', 'item', 'details', 'सामान']
      }
    ]
  },

  // 6. Amazon Add to Cart
  {
    id: 'amazon_add_to_cart',
    name: 'Add Item to Cart on Amazon',
    category: 'ecommerce_food',
    triggerPatterns: ['cart me daalo', 'baad me khareedna hai', 'add to cart amazon', 'कार्ट में डालें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Add to Cart Button',
        hindiInstruction: 'कदम 1/2: सामान को थैले (Cart) में डालने के लिए Add to Cart पर दबाएं।',
        expectedKeywords: ['add to cart', 'cart', 'कार्ट']
      },
      {
        stepNumber: 2,
        label: 'Go to Cart',
        hindiInstruction: 'कदम 2/2: अपना कार्ट देखने के लिए ऊपर टोकरी आइकन पर दबाएं।',
        expectedKeywords: ['cart', 'view cart', 'टोकरी']
      }
    ]
  },

  // 7. Amazon Checkout & Pay
  {
    id: 'amazon_checkout_pay',
    name: 'Buy Now & Checkout Amazon',
    category: 'ecommerce_food',
    triggerPatterns: ['amazon se order karna', 'buy now amazon', 'saman khareedo', 'अमेज़न से खरीदें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Buy Now Button',
        hindiInstruction: 'कदम 1/2: तुरंत खरीदने के लिए पीले रंग के Buy Now बटन पर दबाएं।',
        expectedKeywords: ['buy now', 'proceed to buy', 'खरीदें']
      },
      {
        stepNumber: 2,
        label: 'Place Your Order',
        hindiInstruction: 'कदम 2/2: अपना पता चेक करके Place Your Order पर दबाएं।',
        expectedKeywords: ['place your order', 'pay', 'ऑर्डर']
      }
    ]
  },

  // 8. Track Delivery Rider
  {
    id: 'order_track_delivery_rider',
    name: 'Track Delivery Rider Live',
    category: 'ecommerce_food',
    triggerPatterns: ['saman kahan pahuncha', 'rider kahan hai', 'order track karo', 'डिलीवरी ट्रैक'],
    steps: [
      {
        stepNumber: 1,
        label: 'Track Order Button',
        hindiInstruction: 'कदम 1/2: डिलीवरी देखने के लिए Track Order पर दबाएं।',
        expectedKeywords: ['track', 'track order', 'live', 'ट्रैक']
      },
      {
        stepNumber: 2,
        label: 'View Map and Call Rider',
        hindiInstruction: 'कदम 2/2: यहाँ नक्शे पर राइडर देखें, या जरूरत पड़ने पर Call Delivery Partner दबाएं।',
        expectedKeywords: ['call', 'partner', 'map', 'कॉल']
      }
    ]
  },

  // 9. Return / Exchange Order
  {
    id: 'order_return_exchange',
    name: 'Return or Replace Item',
    category: 'ecommerce_food',
    triggerPatterns: ['saman wapas karna hai', 'return karna', 'exchange karna hai', 'वापस करना'],
    steps: [
      {
        stepNumber: 1,
        label: 'My Orders',
        hindiInstruction: 'कदम 1/3: अपने पुराने ऑर्डर देखने के लिए Your Orders पर दबाएं।',
        expectedKeywords: ['orders', 'your orders', 'ऑर्डर']
      },
      {
        stepNumber: 2,
        label: 'Return / Replace Item',
        hindiInstruction: 'कदम 2/3: जो सामान वापस करना है, उस पर Return or Replace दबाएं।',
        expectedKeywords: ['return', 'replace', 'exchange', 'वापस']
      },
      {
        stepNumber: 3,
        label: 'Choose Reason & Submit',
        hindiInstruction: 'कदम 3/3: वापसी का कारण चुनकर सबमिट दबाएं।',
        expectedKeywords: ['continue', 'submit', 'सबमिट']
      }
    ]
  },

  // 10. Cancel Active Order
  {
    id: 'order_cancel_item',
    name: 'Cancel Placed Order',
    category: 'ecommerce_food',
    triggerPatterns: ['order cancel karo', 'galti se order ho gaya', 'saman nahi chahiye', 'ऑर्डर रद्द करें'],
    steps: [
      {
        stepNumber: 1,
        label: 'Open Order Details',
        hindiInstruction: 'कदम 1/2: रद्द करने के लिए उस ऑर्डर की जानकारी खोलें।',
        expectedKeywords: ['order details', 'view order', 'ऑर्डर']
      },
      {
        stepNumber: 2,
        label: 'Cancel Order Button',
        hindiInstruction: 'कदम 2/2: यहाँ Cancel Items पर दबाकर ऑर्डर रद्द करें।',
        expectedKeywords: ['cancel', 'cancel items', 'रद्द']
      }
    ]
  },

  // 11. Search Deals on Flipkart
  {
    id: 'flipkart_search_deals',
    name: 'Search Deals on Flipkart',
    category: 'ecommerce_food',
    triggerPatterns: ['flipkart par dhoondho', 'flipkart sale', 'flipkart saman', 'फ्लिपकार्ट'],
    steps: [
      {
        stepNumber: 1,
        label: 'Flipkart Search',
        hindiInstruction: 'कदम 1/2: सामान खोजने के लिए Flipkart सर्च बार पर दबाएं।',
        expectedKeywords: ['search', 'flipkart', 'खोजें']
      },
      {
        stepNumber: 2,
        label: 'Check Price & Buy',
        hindiInstruction: 'कदम 2/2: सामान पसंद करके Buy Now पर दबाएं।',
        expectedKeywords: ['buy now', 'add to cart', 'खरीदें']
      }
    ]
  },

  // 12. Customer Support Chat
  {
    id: 'ecommerce_customer_support',
    name: 'Talk to Customer Care Support',
    category: 'ecommerce_food',
    triggerPatterns: ['customer care se baat', 'support chat', 'pareshani hai customer care', 'कस्टमर केयर'],
    steps: [
      {
        stepNumber: 1,
        label: 'Help Center / Customer Service',
        hindiInstruction: 'कदम 1/2: मदद के लिए Help Center या Customer Service पर दबाएं।',
        expectedKeywords: ['help', 'customer service', 'support', 'मदद']
      },
      {
        stepNumber: 2,
        label: 'Chat with Us / Call Back',
        hindiInstruction: 'कदम 2/2: बात करने के लिए Chat with Us या Request a Call दबाएं।',
        expectedKeywords: ['chat', 'call', 'contact us', 'बात']
      }
    ]
  },

  // 13. Apply Discount Coupon
  {
    id: 'apply_discount_coupon',
    name: 'Apply Coupon or Promo Code',
    category: 'ecommerce_food',
    triggerPatterns: ['coupon lagao', 'discount chahiye', 'promo code dalna', 'कूपन लगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Apply Coupon Link',
        hindiInstruction: 'कदम 1/2: छूट पाने के लिए Apply Coupon पर दबाएं।',
        expectedKeywords: ['apply coupon', 'coupon', 'promo', 'कूपन']
      },
      {
        stepNumber: 2,
        label: 'Tap Apply Button',
        hindiInstruction: 'कदम 2/2: कूपन कोड के सामने हरे Apply बटन पर दबाएं।',
        expectedKeywords: ['apply', 'claim', 'लागू']
      }
    ]
  },

  // 14. Change Delivery Address
  {
    id: 'change_delivery_address',
    name: 'Change Delivery Address',
    category: 'ecommerce_food',
    triggerPatterns: ['pata badalna hai', 'delivery address change', 'doosre pate pe bhejo', 'पता बदलो'],
    steps: [
      {
        stepNumber: 1,
        label: 'Select Address',
        hindiInstruction: 'कदम 1/2: डिलीवरी पता बदलने के लिए Change Address पर दबाएं।',
        expectedKeywords: ['address', 'deliver to', 'change', 'पता']
      },
      {
        stepNumber: 2,
        label: 'Choose Saved Address or Add New',
        hindiInstruction: 'कदम 2/2: अपना घर का पता चुनें या नया पता जोड़ें।',
        expectedKeywords: ['home', 'add address', 'select', 'घर']
      }
    ]
  },

  // 15. Reorder Past Purchase
  {
    id: 'reorder_past_purchase',
    name: 'Reorder Past Meal or Grocery',
    category: 'ecommerce_food',
    triggerPatterns: ['phir se wahi mangao', 'purana order dobara', 'reorder karo', 'दोबारा मंगाओ'],
    steps: [
      {
        stepNumber: 1,
        label: 'Order History',
        hindiInstruction: 'कदम 1/2: पुराना ऑर्डर देखने के लिए Past Orders पर दबाएं।',
        expectedKeywords: ['orders', 'past', 'history', 'पुराने']
      },
      {
        stepNumber: 2,
        label: 'Repeat / Reorder',
        hindiInstruction: 'कदम 2/2: वही सामान दोबारा मंगाने के लिए Reorder दबाएं।',
        expectedKeywords: ['reorder', 'repeat', 'दोबारा']
      }
    ]
  }
];
