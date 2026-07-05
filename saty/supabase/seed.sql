insert into public.menu_categories (slug, name_ko, name_en, description, sort_order)
values
  ('coffee', '커피', 'COFFEE', '전 메뉴 HOT/ICE 모두 가격 동일, 가격 단위 천원', 1),
  ('non-coffee', '논커피', 'NON-COFFEE', null, 2),
  ('dessert', '디저트', 'DESSERT', null, 3)
on conflict (slug) do update
set name_ko = excluded.name_ko,
    name_en = excluded.name_en,
    description = excluded.description,
    sort_order = excluded.sort_order;

with coffee as (
  select id from public.menu_categories where slug = 'coffee'
)
insert into public.menu_items (
  category_id,
  code,
  name_ko,
  name_en,
  summary,
  description,
  price,
  flavor_notes,
  origin,
  farm,
  altitude,
  variety,
  processing,
  roasting_point,
  sort_order
)
select coffee.id, item.code, item.name_ko, item.name_en, item.summary, item.description, item.price,
       item.flavor_notes, item.origin, item.farm, item.altitude, item.variety, item.processing,
       item.roasting_point, item.sort_order
from coffee
cross join (
  values
    (
      'C1-1',
      '콜롬비아 나리뇨 부에사코 게이샤 워시드',
      'Colombia Nariño Buesaco Geisha Washed',
      '자스민, 히비스커스, 오렌지, 시럽',
      '콜롬비아 나리뇨 부에사코 지역 고지대에서 소규모로 재배된 게이샤 품종만을 선별한 커피입니다.',
      15.0,
      array['자스민', '히비스커스', '오렌지', '시럽'],
      'Colombia 콜롬비아',
      'SmallHolders Buesaco 부에사코 소농민',
      '2,000~2,180m',
      'Geisha 게이샤',
      'Washed 워시드',
      'Light - 1',
      1
    ),
    (
      'C2-1',
      '콜롬비아 라스 마리아스 시드라 무산소 더블 워시드',
      'Colombia Las Marias Sidra Anaerobic Double Washed',
      '살구와 오렌지의 산미, 당밀 같은 단맛이 조화를 이루는 커피',
      '킨디오주 피하오의 고산지대 라스 마리아스 농장에서 온 시드라 품종 커피입니다.',
      12.0,
      array['살구', '오렌지', '당밀'],
      'Colombia 콜롬비아',
      'Las Marias Estate, Jose Giraldo 라스 마리아스, 호세 히랄도',
      '1,950m',
      'Sidra 시드라',
      'Multi-Stage Fermentation, Double Washed 무산소 - 더블 워시드',
      'Light - 2',
      2
    ),
    (
      'B5',
      '브라질 벨라 포르모사 옐로우 카투아이 내추럴',
      'Brazil Bela Formosa Yellow Catuai Natural',
      '전형적인 브라질 커피의 견과류 같은 고소함과 은은한 오렌지 산미가 좋은 커피',
      null,
      7.0,
      array['아몬드', '당밀', '갈색설탕', '오렌지'],
      'Ibiraci, Minas Gerais, Brazil',
      'Bela Formosa 벨라 포르모사',
      '1,250m',
      'Yellow Catuai 옐로우 카투아이',
      'Natural 내추럴',
      '미디엄',
      3
    ),
    (
      'C5-0',
      '콜롬비아 수프리모 후일라 슈가케인 디카페인',
      'Colombia Supremo Huila Sugarcane Decaf',
      '고소한 견과류, 좋은 단향과 짙은 여운이 인상적인 디카페인 커피',
      '사탕수수를 발효해 추출한 천연성분으로 카페인을 제거한 콜롬비아 후일라 디카페인 원두입니다.',
      7.0,
      array['갈색 설탕', '땅콩 버터', '물엿'],
      'Huila, Colombia 후일라, 콜롬비아',
      '-',
      '1,100m ~ 1,700m',
      'Caturra, Castillo, Typica 카투라, 카스티요, 티피카',
      'Sugarcane 슈가케인',
      'Medium - 5',
      4
    )
) as item(
  code,
  name_ko,
  name_en,
  summary,
  description,
  price,
  flavor_notes,
  origin,
  farm,
  altitude,
  variety,
  processing,
  roasting_point,
  sort_order
)
on conflict (category_id, code) do update
set name_ko = excluded.name_ko,
    name_en = excluded.name_en,
    summary = excluded.summary,
    description = excluded.description,
    price = excluded.price,
    flavor_notes = excluded.flavor_notes,
    origin = excluded.origin,
    farm = excluded.farm,
    altitude = excluded.altitude,
    variety = excluded.variety,
    processing = excluded.processing,
    roasting_point = excluded.roasting_point,
    sort_order = excluded.sort_order;
