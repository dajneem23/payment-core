export class CommonModel {
  getPagination({ _page, _pageSize }: { _page?: string; _pageSize?: string }): {
    take: number;
    skip: number;
  } {
    const pageAsNumber = _page ? +_page : 1;

    const pageSizeAsNumber = _pageSize ? +_pageSize : 10;

    const take = pageSizeAsNumber > 100 ? 100 : pageSizeAsNumber;

    const skip = take * (pageAsNumber - 1);

    return { take, skip };
  }
}
