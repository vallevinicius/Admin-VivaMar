export type OtaSource = "booking" | "expedia" | "hotels_com" | "manual";

export type RoomSeasonalRate = {
  label?: string;
  startMonthDay: string;
  endMonthDay: string;
  price: number;
  minStayNights?: number | null;
  minStayDays?: number | null;
};

export type RoomClosurePeriod = {
  label?: string;
  startDate: string;
  endDate: string;
  kind?: "blocked" | "closed";
};

export type Room = {
  id: string;
  channexRoomTypeId: string;
  name: string;
  maxGuests: number;
  price: number;
  minStayNights?: number | null;
  minStayDays?: number | null;
  seasonalRates?: RoomSeasonalRate[];
  closurePeriods?: RoomClosurePeriod[];
  quantity: number;
  status: "active" | "maintenance";
  amenities?: string | string[] | null;
  amenitiesList?: string[];
  photoUrls?: string[];
};

export type ReservationStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "blocked";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
};

export type Reservation = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  otaSource: OtaSource;
  channelReference: string;
  amount: number;
  currency: string;
  customer: Customer;
  notes: string;
};

export type ExpenseCategory =
  | "limpeza"
  | "manutenção"
  | "impostos"
  | "insumos"
  | "comissões"
  | "outros";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
};

export type ChannexError = {
  code: string;
  title: string;
  details?: Record<string, string[]>;
};

export type ChannexMeta = {
  message?: string;
  limit?: number;
  page?: number;
  total?: number;
};

export type ChannexResponse<T> = {
  data: T | T[];
  meta?: ChannexMeta;
  errors?: ChannexError;
};

export type ChannexCreateRequest<T> = {
  [type: string]: T;
};

export type ChannexRoomType = {
  id: string;
  type: "room_type";
  attributes: {
    title?: string;
    name?: string;
    status?: "active" | "inactive" | string;
    max_occupancy?: {
      adults?: number;
      children?: number;
      infants?: number;
    };
  };
};

export type ChannexBooking = {
  id: string;
  type: "booking";
  attributes: {
    property_id?: string;
    arrival_date?: string;
    departure_date?: string;
    status?: "new" | "modified" | "cancelled" | string;
    currency?: string;
    amount?: string | number;
    notes?: string;
    ota_source?: OtaSource;
    channel_reference?: string;
    reference?: string;
    customer?: {
      name?: string;
      surname?: string;
      email?: string;
      phone?: string;
    };
    rooms?: Array<{
      checkin_date?: string;
      checkout_date?: string;
      room_type_id?: string;
      rate_plan_id?: string;
      amount?: string;
      occupancy?: {
        adults?: number;
        children?: number;
        infants?: number;
      };
    }>;
  };
};

export interface ChannexBookingPayload {
  booking: {
    property_id: string;
    arrival_date: string;
    departure_date: string;
    status: "new" | "modified" | "cancelled";
    currency: string;
    amount: string;
    notes?: string;
    customer: {
      name: string;
      surname?: string;
      email: string;
      phone?: string;
    };
    rooms: Array<{
      checkin_date: string;
      checkout_date: string;
      room_type_id: string;
      rate_plan_id: string;
      amount: string;
      occupancy: { adults: number; children: number; infants: number };
    }>;
  };
}

export type ChannexPropertyType =
  | "apart_hotel"
  | "apartment"
  | "boat"
  | "camping"
  | "capsule_hotel"
  | "chalet"
  | "country_house"
  | "farm_stay"
  | "guest_house"
  | "holiday_home"
  | "holiday_park"
  | "homestay"
  | "hostel"
  | "hotel"
  | "inn"
  | "lodge"
  | "motel"
  | "resort"
  | "riad"
  | "ryokan"
  | "tent"
  | "villa";

export type ChannexPropertySettings = {
  allow_availability_autoupdate_on_confirmation?: boolean;
  allow_availability_autoupdate_on_modification?: boolean;
  allow_availability_autoupdate_on_cancellation?: boolean;
  min_stay_type?: "both" | "arrival" | "through";
  min_price?: string | number | null;
  max_price?: string | number | null;
  state_length?: number;
  cut_off_time?: string;
  cut_off_days?: number;
  max_day_advance?: number | null;
};

export type ChannexPropertyContent = {
  description?: string | null;
  important_information?: string | null;
  photos?: Array<{
    url: string;
    position?: number;
    author?: string;
    kind?: "photo" | "ad" | "menu";
    description?: string;
  }>;
};

export type ChannexPropertyAttributes = {
  id?: string;
  title: string;
  is_active?: boolean;
  email?: string;
  phone?: string;
  currency: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  zip_code?: string;
  latitude?: string | null;
  longitude?: string | null;
  timezone?: string;
  property_type?: ChannexPropertyType;
  website?: string;
  logo_url?: string | null;
  settings?: ChannexPropertySettings;
  content?: ChannexPropertyContent;
};

export type ChannexProperty = {
  type: "property";
  id: string;
  attributes: ChannexPropertyAttributes;
};

export type ChannexPropertyOption = {
  type: "properties";
  id: string;
  attributes: {
    id: string;
    title: string;
    currency: string;
  };
};

export type ChannexCreatePropertyPayload = {
  property: ChannexPropertyAttributes & {
    group_id?: string;
    facilities?: string[];
  };
};

export type ChannexUpdatePropertyPayload = ChannexCreatePropertyPayload;

export type ChannexAccessRole = "owner" | "user";

export type ChannexLinkedUser = {
  id: string;
  type: "user";
  email?: string;
  name?: string;
};

export type ChannexPropertyUser = {
  id: string;
  type: "property_user";
  attributes: {
    id: string;
    overrides: Record<string, unknown> | null;
    property_id: string;
    role: ChannexAccessRole;
    user_id: string;
  };
  relationships?: {
    property?: { data: { id: string; type: "property" } };
    user?: { data: ChannexLinkedUser };
  };
};

export type ChannexInvitePropertyUserPayload = {
  invite: {
    property_id: string;
    user_email: string;
    role: ChannexAccessRole;
    overrides?: Record<string, unknown>;
  };
};

export type ChannexUpdatePropertyUserPayload = {
  property_user: {
    role: ChannexAccessRole;
    overrides?: Record<string, unknown> | null;
  };
};

export type ChannexGroup = {
  id: string;
  type: "group";
  attributes: {
    id: string;
    title: string;
  };
  relationships?: {
    properties?: {
      data: Array<{
        id: string;
        type: "property";
        attributes?: {
          id: string;
          title: string;
        };
      }>;
    };
  };
};

export type ChannexCreateGroupPayload = {
  group: {
    title: string;
  };
};

export type ChannexUpdateGroupPayload = ChannexCreateGroupPayload;

export type ChannexGroupUser = {
  id: string;
  type: "group_user";
  attributes: {
    id: string;
    overrides: Record<string, unknown> | null;
    group_id: string;
    role: ChannexAccessRole;
    user_id: string;
  };
  relationships?: {
    group?: { data: { id: string; type: "group" } };
    user?: { data: ChannexLinkedUser };
  };
};

export type ChannexInviteGroupUserPayload = {
  invite: {
    group_id: string;
    user_email: string;
    role: ChannexAccessRole;
    overrides?: Record<string, unknown>;
  };
};

export type ChannexUpdateGroupUserPayload = {
  group_user: {
    role: ChannexAccessRole;
    overrides?: Record<string, unknown> | null;
  };
};

export type ChannexRoomTypeOption = {
  id: string;
  type: "room_type";
  attributes: {
    id: string;
    property_id: string;
    title: string;
    default_occupancy: number;
  };
};

export type ChannexRoomTypeResource = {
  id: string;
  type: "room_type";
  attributes: {
    id: string;
    title: string;
    property_id?: string;
    occ_adults: number;
    occ_children: number;
    occ_infants: number;
    default_occupancy: number;
    count_of_rooms: number;
    room_kind?: "room" | "dorm";
    capacity?: number | null;
    content?: ChannexPropertyContent;
  };
  relationships?: {
    property?: { data: { id: string; type: "property" } };
  };
};

export type ChannexCreateRoomTypePayload = {
  room_type: {
    property_id: string;
    title: string;
    count_of_rooms: number;
    occ_adults: number;
    occ_children: number;
    occ_infants: number;
    default_occupancy: number;
    facilities?: string[];
    room_kind?: "room" | "dorm";
    capacity?: number | null;
    content?: ChannexPropertyContent;
  };
};

export type ChannexUpdateRoomTypePayload = {
  room_type: Partial<ChannexCreateRoomTypePayload["room_type"]>;
};

export type ChannexRatePlanOption = {
  id: string;
  type: "rate_plan";
  attributes: {
    id: string;
    title: string;
    property_id: string;
    room_type_id: string;
    sell_mode: "per_room" | "per_person";
    occupancy?: number;
    parent_rate_plan_id?: string | null;
    rate_category_id?: string | null;
  };
};

export type ChannexRatePlanResource = {
  id: string;
  type: "rate_plan";
  attributes: {
    id: string;
    title: string;
    property_id?: string;
    room_type_id?: string;
    sell_mode: "per_room" | "per_person";
    rate_mode: "manual" | "derived" | "auto" | "cascade";
    currency?: string;
    children_fee?: string;
    infant_fee?: string;
    max_stay?: number[];
    min_stay_arrival?: number[];
    min_stay_through?: number[];
    closed_to_arrival?: boolean[];
    closed_to_departure?: boolean[];
    stop_sell?: boolean[];
    options: Array<{
      occupancy: number;
      is_primary: boolean;
      rate?: number;
      derived_option?: Record<string, unknown> | null;
    }>;
    [key: string]: unknown;
  };
};

export type ChannexCreateRatePlanPayload = {
  rate_plan: {
    title: string;
    property_id: string;
    room_type_id: string;
    tax_set_id?: string;
    parent_rate_plan_id?: string | null;
    children_fee?: string;
    infant_fee?: string;
    max_stay?: number[];
    min_stay_arrival?: number[];
    min_stay_through?: number[];
    closed_to_arrival?: boolean[];
    closed_to_departure?: boolean[];
    stop_sell?: boolean[];
    options: Array<{
      occupancy: number;
      is_primary: boolean;
      rate?: number;
      derived_option?: Record<string, unknown>;
    }>;
    currency?: string;
    sell_mode?: "per_room" | "per_person";
    rate_mode?: "manual" | "derived" | "auto" | "cascade";
    [key: string]: unknown;
  };
};

export type ChannexUpdateRatePlanPayload = {
  rate_plan: Partial<ChannexCreateRatePlanPayload["rate_plan"]>;
};

export type ChannexRestrictionName =
  | "availability"
  | "rate"
  | "min_stay_arrival"
  | "min_stay_through"
  | "min_stay"
  | "closed_to_arrival"
  | "closed_to_departure"
  | "stop_sell"
  | "max_stay"
  | "availability_offset"
  | "max_availability";

export type ChannexRestrictionObject = Record<
  string,
  Record<string, Record<string, string | number | boolean | null>>
>;
export type ChannexAvailabilityObject = Record<string, Record<string, number>>;

export type ChannexAriValue = {
  property_id: string;
  rate_plan_id?: string;
  room_type_id?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  days?: Array<"mo" | "tu" | "we" | "th" | "fr" | "sa" | "su">;
  rate?: string | number;
  rates?: Array<{ occupancy: number; rate: number }>;
  availability?: number;
  min_stay_arrival?: number;
  min_stay_through?: number;
  min_stay?: number;
  max_stay?: number;
  closed_to_arrival?: boolean | 0 | 1;
  closed_to_departure?: boolean | 0 | 1;
  stop_sell?: boolean | 0 | 1;
};

export type ChannexAriUpdatePayload = {
  values: ChannexAriValue[];
};

export type ChannexTaskResource = {
  id: string;
  type: "task";
};

export type ChannexWebhookResource = {
  id: string;
  type: "webhook";
  attributes: {
    callback_url: string;
    event_mask: string;
    request_params: Record<string, string> | null;
    headers: Record<string, string> | null;
    is_active: boolean;
    send_data: boolean;
  };
  relationships: {
    property: {
      data: {
        type: "property";
        id: string;
      };
    };
  };
};

export type ChannexWebhookWritePayload = {
  webhook: {
    callback_url: string;
    event_mask: string;
    property_id: string;
    request_params?: Record<string, string> | null;
    headers?: Record<string, string> | null;
    is_active?: boolean;
    send_data?: boolean;
  };
};

export type ChannexWebhookTestResponse = {
  status_code: number;
  body: string;
};

export type ChannexBookingGuest = {
  name?: string;
  surname?: string;
};

export type ChannexBookingOccupancy = {
  adults: number;
  children: number;
  infants: number;
  ages?: number[];
};

export type ChannexBookingRoom = {
  amount?: string;
  booking_room_id?: string;
  checkin_date: string;
  checkout_date: string;
  rate_plan_id?: string | null;
  room_type_id?: string | null;
  ota_unique_id?: string | null;
  days?: Record<string, string>;
  occupancy: ChannexBookingOccupancy;
  guests?: ChannexBookingGuest[];
  services?: Array<Record<string, unknown>>;
  taxes?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown> | null;
};

export type ChannexBookingCustomer = {
  name?: string;
  surname?: string;
  mail?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  language?: string;
  zip?: string;
  company?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
};

export type ChannexBookingGuarantee = {
  card_number?: string;
  card_type?: string;
  cardholder_name?: string;
  cvv?: string;
  expiration_date?: string;
  is_virtual?: boolean;
  meta?: Record<string, unknown>;
};

export type ChannexBookingAttributes = {
  id: string;
  property_id: string;
  revision_id?: string;
  booking_id?: string;
  unique_id?: string;
  system_id?: string;
  ota_reservation_code?: string;
  ota_name?: string;
  status: "new" | "modified" | "cancelled";
  rooms: ChannexBookingRoom[];
  services?: Array<Record<string, unknown>>;
  guarantee?: ChannexBookingGuarantee | null;
  customer?: ChannexBookingCustomer;
  occupancy?: ChannexBookingOccupancy;
  arrival_date: string;
  departure_date: string;
  arrival_hour?: string | null;
  amount?: string;
  currency?: string;
  notes?: string | null;
  payment_collect?: "property" | "ota" | null;
  payment_type?: "credit_card" | "bank_transfer" | null;
  ota_commission?: string | null;
  inserted_at?: string;
  [key: string]: unknown;
};

export type ChannexBookingResource = {
  id: string;
  type: "booking";
  attributes: ChannexBookingAttributes;
};

export type ChannexBookingRevisionResource = {
  id: string;
  type: "booking_revision";
  attributes: ChannexBookingAttributes;
};

export type ChannexMetaMessageResponse = {
  message?: string;
  warnings?: unknown[];
};

export type ChannexBookingCrsPayload = {
  booking: {
    status?: "new" | "modified" | "cancelled";
    property_id: string;
    ota_reservation_code: string;
    ota_name: string;
    arrival_date: string;
    departure_date: string;
    arrival_hour?: string;
    services?: Array<Record<string, unknown>>;
    deposits?: Array<Record<string, unknown>>;
    payment_collect?: "property" | "ota" | null;
    payment_type?: "credit_card" | "bank_transfer" | null;
    currency?: string;
    ota_commission?: string;
    notes?: string;
    meta?: Record<string, unknown> | null;
    customer?: ChannexBookingCustomer;
    rooms: Array<{
      room_type_id: string;
      rate_plan_id: string;
      days: Record<string, string>;
      services?: Array<Record<string, unknown>>;
      taxes?: Array<Record<string, unknown>>;
      guests?: ChannexBookingGuest[];
      occupancy: ChannexBookingOccupancy;
      meta?: Record<string, unknown>;
    }>;
  };
};

export type ChannexBookingNoShowPayload = {
  no_show_report: {
    waived_fees: boolean;
    penalty_amount?: string;
  };
};

export type ChannexChannelResource = {
  id: string;
  type: "channel";
  attributes: {
    id: string;
    property_id?: string;
    title?: string;
    channel?: string;
    is_active?: boolean;
    settings?: Record<string, unknown>;
    mappings?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

export type ChannexChannelWritePayload = {
  channel: Record<string, unknown>;
};

export type ChannexChannelSettingsWritePayload = {
  settings: Record<string, unknown>;
};

export type ChannexChannelMappingWritePayload = {
  mappings: Record<string, unknown>;
};

export type ChannexPhotoKind = "photo" | "ad" | "menu";

export type ChannexPhotoResource = {
  id: string;
  type: "photo";
  attributes: {
    id: string;
    property_id: string;
    room_type_id: string | null;
    url: string;
    kind: ChannexPhotoKind;
    author: string | null;
    description: string | null;
    position: number;
  };
};

export type ChannexPhotoWritePayload = {
  photo: {
    property_id: string;
    url: string;
    room_type_id?: string | null;
    kind?: ChannexPhotoKind;
    author?: string;
    description?: string;
    position?: number;
  };
};

export type ChannexPhotoUploadResponse = {
  url: string;
};

export type ChannexHotelPolicyResource = {
  id: string;
  type: "hotel_policy";
  attributes: {
    id: string;
    property_id?: string;
    title: string;
    currency: string;
    is_adults_only?: boolean;
    max_count_of_guests: number;
    checkin_time: string;
    checkout_time: string;
    internet_access_type: "none" | "wifi" | "wired";
    internet_access_coverage:
      | "entire_property"
      | "public_areas"
      | "all_rooms"
      | "some_rooms"
      | "business_centre";
    internet_access_cost?: string | null;
    parking_type: "on_site" | "nearby" | "none";
    parking_reservation: "not_available" | "not_needed" | "needed";
    parking_is_private: boolean;
    pets_policy:
      | "allowed"
      | "not_allowed"
      | "by_arrangements"
      | "assistive_only";
    pets_non_refundable_fee: string;
    pets_refundable_deposit?: string;
    smoking_policy: "no_smoking" | "permitted_areas_only" | "allowed";
    [key: string]: unknown;
  };
};

export type ChannexHotelPolicyWritePayload = {
  hotel_policy: Partial<Omit<ChannexHotelPolicyResource["attributes"], "id">>;
};

export type ChannexFacilityResource = {
  id: string;
  type: "facility";
  attributes: {
    id: string;
    category: string;
    title: string;
  };
};

export type ChannexMessageSender = "guest" | "property" | "system";

export type ChannexMessageResource = {
  id: string;
  type: "message";
  attributes: {
    message: string;
    attachments: string[];
    sender: ChannexMessageSender;
    inserted_at: string;
    updated_at: string;
    meta?: Record<string, unknown>;
  };
  relationships?: {
    message_thread?: {
      data: {
        id: string;
        type: "message_thread";
      };
    };
    user?: {
      data: {
        id: string;
        type: "user";
      };
    };
  };
};

export type ChannexMessageThreadResource = {
  id: string;
  type: "message_thread";
  attributes: {
    title: string;
    is_closed: boolean;
    provider: string;
    message_count: number;
    last_message: {
      attachments: string[];
      inserted_at: string;
      message: string;
      sender: ChannexMessageSender;
    };
    last_message_received_at: string;
    inserted_at: string;
    updated_at: string;
  };
  relationships?: {
    booking?: { data: { id: string; type: "booking" } };
    channel?: { data: { id: string; type: "channel" } };
    property?: { data: { id: string; type: "property" } };
  };
};

export type ChannexBookingMessageWritePayload = {
  message: {
    message?: string;
    attachment_id?: string;
  };
};

export type ChannexThreadMessageWritePayload =
  ChannexBookingMessageWritePayload;

export type ChannexAttachmentResource = {
  id: string;
  type: "attachment";
};

export type ChannexAttachmentCreatePayload = {
  attachment: {
    file: string;
    file_name: string;
    file_type: string;
  };
};

export type ChannexReviewScoreItem = {
  category: string;
  score: number;
};

export type ChannexReviewResource = {
  id: string;
  type: "review";
  attributes: {
    id: string;
    content: string | null;
    guest_name: string | null;
    is_hidden: boolean;
    is_replied: boolean;
    ota: string;
    ota_reservation_id: string;
    overall_score: number | null;
    received_at: string;
    inserted_at: string;
    updated_at: string;
    reply: string | null;
    scores: ChannexReviewScoreItem[];
    tags: string[];
  };
  relationships?: {
    booking?: { data: { id: string; type: "booking" } };
    channel?: { data: { id: string; type: "channel" } };
    property?: { data: { id: string; type: "property"; title?: string } };
  };
};

export type ChannexReviewReplyPayload = {
  reply: {
    reply: string;
  };
};

export type ChannexGuestReviewScorePayload = {
  category: string;
  rating: number;
};

export type ChannexReviewGuestReviewPayload = {
  review: {
    scores: ChannexGuestReviewScorePayload[];
    private_review?: string;
    public_review?: string;
    is_reviewee_recommended?: boolean;
    tags?: string[];
  };
};

export type ChannexScoreMap = Record<
  string,
  {
    count: number;
    score: number;
  }
>;

export type ChannexPropertyScoreResource = {
  id: string;
  type: "score";
  attributes: {
    id: string;
    count: number;
    overall_score: number;
    scores: ChannexScoreMap;
    inserted_at: string;
    updated_at: string;
  };
  relationships?: {
    property?: {
      data: {
        id: string;
        type: "property";
        title?: string;
      };
    };
  };
};

export type ChannexOtaScoreResource = {
  id: string;
  type: "ota_score";
  attributes: {
    id: string;
    channel_id: string;
    count: number;
    ota: string;
    overall_score: number;
    scores: ChannexScoreMap;
  };
};

export type ChannexDetailedScoreResource = ChannexPropertyScoreResource & {
  relationships?: ChannexPropertyScoreResource["relationships"] & {
    ota_scores?: Array<{
      data: ChannexOtaScoreResource;
    }>;
  };
};

export type ChannexAvailabilityRuleType =
  | "close_out"
  | "availability_offset"
  | "max_availability";

export type ChannexAvailabilityRuleResource = {
  id: string;
  type: "channel_availability_rule";
  attributes: {
    id: string;
    title: string;
    type: ChannexAvailabilityRuleType;
    value: number | null;
    days: string[];
    start_date: string;
    end_date: string | null;
    affected_channels: string[];
    affected_room_types: string[];
  };
  relationships?: {
    property?: {
      data: {
        id: string;
        type: "property";
      };
    };
  };
};

export type ChannexAvailabilityRuleWritePayload = {
  title: string;
  type: ChannexAvailabilityRuleType;
  value?: number | null;
  affected_channels: string[];
  affected_room_types: string[];
  days?: string[];
  start_date: string;
  end_date?: string;
  property_id: string;
};

export type ChannexCreateAvailabilityRulePayload = {
  channel_availability_rule: ChannexAvailabilityRuleWritePayload;
};

export type ChannexUpdateAvailabilityRulePayload =
  ChannexCreateAvailabilityRulePayload;

export type ChannexStripeTokenResponse = {
  token: string;
};

export type ChannexPaymentConnectPayload = {
  provider: "stripe";
  title: string;
  redirect_url: string;
};

export type ChannexPaymentConnectResponse = {
  link: string;
};

export type ChannexPaymentProviderResource = {
  id: string;
  type: "payment_provider";
  attributes: {
    id: string;
    title: string;
    provider: string;
    is_active: boolean;
    is_default: boolean;
    details: {
      account_id?: string;
      [key: string]: unknown;
    };
  };
};

export type ChannexPaymentProviderListPayload = {
  page?: number;
  limit?: number;
};

export type ChannexPaymentUpdateProviderPayload = {
  id: string;
  params: {
    title: string;
  };
};

export type ChannexPaymentTransactionType =
  | "charge"
  | "refund"
  | "pre_auth"
  | "void";

export type ChannexPaymentTransaction = {
  id: string;
  type: ChannexPaymentTransactionType;
  currency: string;
  amount: string;
  inserted_at: string;
  updated_at: string;
  ip_address?: string;
  booking_id: string;
  user_id?: string;
  payment_provider_id?: string;
  details: {
    id: string;
    [key: string]: unknown;
  };
};

export type ChannexPaymentStatus =
  | "charged"
  | "refunded"
  | "pre_authorized"
  | "cancelled"
  | "partially_refunded";

export type ChannexPaymentResource = {
  id: string;
  type: "payment";
  attributes: {
    id: string;
    status: ChannexPaymentStatus;
    description: string | null;
    currency: string;
    amount: string;
    inserted_at: string;
    updated_at: string;
    transactions: ChannexPaymentTransaction[];
    booking_id: string;
  };
  relationships?: {
    users?: {
      data: Array<{
        id: string;
        type: "user";
        attributes?: {
          id: string;
          name?: string;
          email?: string;
        };
      }>;
    };
    booking?: {
      data: {
        id: string;
        type: "booking";
        attributes?: {
          id: string;
          reference?: string;
        };
      };
    };
    payment_provider?: {
      data: ChannexPaymentProviderResource;
    };
  };
};

export type ChannexBookingPaymentActionPayload = {
  amount?: string;
  booking_id?: string;
  payment_provider_id?: string;
  payment_id?: string;
  description?: string;
};

export type ChannexPaymentTransactionsQueryPayload = {
  pagination?: {
    page?: number;
    limit?: number;
  };
  order?: {
    inserted_at?: "asc" | "desc";
  };
  filter?: Record<string, unknown>;
};

export type ChannexOneTimeTokenPayload = {
  one_time_token: {
    property_id: string;
    group_id?: string;
    username: string;
  };
};

export type ChannexOneTimeTokenResponse = {
  token: string;
};
